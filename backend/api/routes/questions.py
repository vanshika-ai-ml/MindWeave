import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.db_models import LearningSession, Concept, Question
from backend.schemas.question import (
    QuestionGenerateRequest,
    QuestionnaireResponse,
    ClientQuestionItem
)
from backend.ai.gemini_client import gemini_client
from backend.ai.prompts import SYSTEM_INSTRUCTION, build_question_generation_prompt

logger = logging.getLogger("mindweave.routes.questions")
router = APIRouter(prefix="/sessions", tags=["Questions"])

@router.post("/{session_id}/questions", response_model=QuestionnaireResponse)
def generate_questions_for_session(
    session_id: str,
    payload: QuestionGenerateRequest = QuestionGenerateRequest(),
    db: Session = Depends(get_db)
):
    """
    Generates concept-linked diagnostic questions for a session.
    Reference rubrics and correct answers are stored securely in the database and NOT sent to the client.
    """
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    concepts = db.query(Concept).filter(Concept.session_id == session_id).all()
    if not concepts:
        raise HTTPException(status_code=400, detail="No concepts available for this session.")

    concepts_data = [
        {"id": c.id, "label": c.label, "description": c.description}
        for c in concepts
    ]

    prompt = build_question_generation_prompt(
        topic=session.topic,
        concepts_data=concepts_data,
        question_count=payload.question_count,
        difficulty=payload.difficulty
    )

    try:
        ai_data = gemini_client.generate_json(prompt, system_instruction=SYSTEM_INSTRUCTION)
        raw_questions = ai_data.get("questions", [])

        # Delete any previous non-retest questions for clean state
        db.query(Question).filter(Question.session_id == session_id, Question.is_retest == False).delete()

        client_questions: List[ClientQuestionItem] = []
        for idx, q in enumerate(raw_questions):
            qid = f"q_{session_id[:8]}_{idx + 1}"
            cid = q.get("concept_id")
            
            # Match concept label
            c_match = next((c for c in concepts if c.id == cid), None)
            c_label = c_match.label if c_match else cid
            # Fallback concept_id if AI gave an unmapped id
            if not c_match and concepts:
                cid = concepts[idx % len(concepts)].id
                c_label = concepts[idx % len(concepts)].label

            qtype = q.get("question_type", "mcq")
            qtext = q.get("question_text", "Explain this concept.")
            options = q.get("options", [])
            diff = q.get("difficulty", payload.difficulty)
            rubric = q.get("reference_rubric", "Accurate conceptual understanding.")

            db_question = Question(
                id=qid,
                session_id=session_id,
                concept_id=cid,
                question_type=qtype,
                question_text=qtext,
                options=options,
                reference_rubric=rubric,
                difficulty=diff,
                is_retest=False
            )
            db.add(db_question)

            # Return client safe version
            client_questions.append(
                ClientQuestionItem(
                    id=qid,
                    concept_id=cid,
                    concept_label=c_label,
                    question_type=qtype,
                    question_text=qtext,
                    options=options,
                    difficulty=diff,
                    is_retest=False
                )
            )

        db.commit()

        return QuestionnaireResponse(
            session_id=session_id,
            topic=session.topic,
            questions=client_questions
        )

    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questionnaire: {str(e)}")

@router.get("/{session_id}/questions", response_model=QuestionnaireResponse)
def get_existing_questions(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieves existing non-retest questions for a session.
    """
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    questions = (
        db.query(Question)
        .filter(Question.session_id == session_id, Question.is_retest == False)
        .all()
    )

    concepts = {c.id: c.label for c in db.query(Concept).filter(Concept.session_id == session_id).all()}

    client_questions = [
        ClientQuestionItem(
            id=q.id,
            concept_id=q.concept_id,
            concept_label=concepts.get(q.concept_id, q.concept_id),
            question_type=q.question_type,
            question_text=q.question_text,
            options=q.options or [],
            difficulty=q.difficulty,
            is_retest=False
        )
        for q in questions
    ]

    return QuestionnaireResponse(
        session_id=session_id,
        topic=session.topic,
        questions=client_questions
    )
