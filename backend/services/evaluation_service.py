import logging
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.models.db_models import Question, StudentAnswer, Concept, LearningSession
from backend.schemas.evaluation import (
    AnswerSubmissionRequest,
    EvaluationSummaryResponse,
    QuestionEvaluationResult
)
from backend.ai.gemini_client import gemini_client
from backend.ai.prompts import SYSTEM_INSTRUCTION, build_answer_evaluation_prompt
from backend.services.understanding_engine import compute_concept_mastery

logger = logging.getLogger("mindweave.service.evaluation")

def evaluate_student_answers(
    db: Session,
    session_id: str,
    submission: AnswerSubmissionRequest,
    is_retest: bool = False
) -> EvaluationSummaryResponse:
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found.")

    # Gather questions for this submission
    eval_batch = []
    question_map = {}

    for item in submission.answers:
        q = db.query(Question).filter(Question.id == item.question_id, Question.session_id == session_id).first()
        if not q:
            continue
        concept = db.query(Concept).filter(Concept.id == q.concept_id).first()
        concept_label = concept.label if concept else q.concept_id

        question_map[q.id] = (q, concept_label)
        eval_batch.append({
            "question_id": q.id,
            "concept_id": q.concept_id,
            "concept_label": concept_label,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "options": q.options or [],
            "student_answer": item.student_answer,
            "reference_rubric": q.reference_rubric
        })

    if not eval_batch:
        raise HTTPException(status_code=400, detail="No matching questions found for this session.")

    # Call Gemini for semantic evaluation and misconception diagnosis
    prompt = build_answer_evaluation_prompt(eval_batch)
    ai_result = gemini_client.generate_json(prompt, system_instruction=SYSTEM_INSTRUCTION)
    evaluations_raw = ai_result.get("evaluations", [])

    results: List[QuestionEvaluationResult] = []
    total_score = 0

    if not evaluations_raw:
        raise HTTPException(
            status_code=502,
            detail="AI returned no evaluations. Please retry."
        )

    for item in evaluations_raw:
        q_id = item.get("question_id")
        if q_id not in question_map:
            continue
        q, c_label = question_map[q_id]
        
        score = max(0, min(100, int(item.get("score", 50))))
        correctness = item.get("correctness", "partially_correct")
        understanding_level = item.get("understanding_level", "developing")
        feedback = item.get("feedback", "Answer evaluated.")
        misconception = item.get("misconception")
        if misconception and (misconception.lower() in ("null", "none") or not misconception.strip()):
            misconception = None
        suggested_correction = item.get("suggested_correction")

        # Find matching student answer text
        student_text = next((a.student_answer for a in submission.answers if a.question_id == q_id), "")

        # Save to DB
        answer_record = StudentAnswer(
            session_id=session_id,
            question_id=q_id,
            concept_id=q.concept_id,
            student_answer=student_text,
            score=score,
            correctness=correctness,
            understanding_level=understanding_level,
            feedback=feedback,
            misconception=misconception,
            suggested_correction=suggested_correction,
            is_retest=is_retest
        )
        db.add(answer_record)

        results.append(
            QuestionEvaluationResult(
                question_id=q_id,
                concept_id=q.concept_id,
                concept_label=c_label,
                question_text=q.question_text,
                student_answer=student_text,
                score=score,
                correctness=correctness,
                understanding_level=understanding_level,
                feedback=feedback,
                misconception=misconception,
                suggested_correction=suggested_correction
            )
        )
        total_score += score

    db.commit()

    # Re-calculate concept-level understanding map
    concept_statuses = compute_concept_mastery(db, session_id)
    weak_concept_ids = [c.concept_id for c in concept_statuses if c.needs_revision]
    overall_avg = round(total_score / len(results)) if results else 0

    return EvaluationSummaryResponse(
        session_id=session_id,
        overall_score=overall_avg,
        evaluations=results,
        concept_statuses=concept_statuses,
        weak_concept_ids=weak_concept_ids,
        is_retest=is_retest
    )
