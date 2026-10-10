import logging
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.models.db_models import (
    LearningSession, Concept, Question, StudentAnswer, RevisionLog, ProgressRecord
)
from backend.schemas.revision import (
    RevisionResponse, RevisionModule, RetestCompareResponse
)
from backend.schemas.question import ClientQuestionItem
from backend.schemas.evaluation import AnswerSubmissionRequest
from backend.ai.gemini_client import gemini_client
from backend.ai.prompts import (
    SYSTEM_INSTRUCTION, build_revision_prompt, build_retest_prompt
)
from backend.services.evaluation_service import evaluate_student_answers

logger = logging.getLogger("mindweave.service.revision")

def generate_revision_modules(
    db: Session,
    session_id: str,
    target_concept_ids: Optional[List[str]] = None
) -> RevisionResponse:
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    query = db.query(Concept).filter(Concept.session_id == session_id)
    if target_concept_ids:
        query = query.filter(Concept.id.in_(target_concept_ids))
    else:
        # Default to all concepts needing revision
        query = query.filter(Concept.status_tier.in_(["novice", "developing"]))

    concepts = query.all()
    if not concepts:
        # If none strictly in novice/developing, take any concept or all
        concepts = db.query(Concept).filter(Concept.session_id == session_id).all()

    weak_concept_data = []
    for c in concepts:
        # Find any recent misconceptions
        recent_answers = (
            db.query(StudentAnswer)
            .filter(StudentAnswer.session_id == session_id, StudentAnswer.concept_id == c.id)
            .all()
        )
        misconceptions = [a.misconception for a in recent_answers if a.misconception]
        weak_concept_data.append({
            "id": c.id,
            "label": c.label,
            "description": c.description,
            "detected_misconceptions": misconceptions[:2]
        })

    prompt = build_revision_prompt(session.topic, weak_concept_data)
    ai_result = gemini_client.generate_json(prompt, system_instruction=SYSTEM_INSTRUCTION)
    raw_modules = ai_result.get("modules", [])

    modules: List[RevisionModule] = []
    for mod in raw_modules:
        cid = mod.get("concept_id")
        c_obj = next((c for c in concepts if c.id == cid), None)
        c_label = c_obj.label if c_obj else mod.get("concept_label", cid)

        revision_entry = RevisionLog(
            session_id=session_id,
            concept_id=cid,
            concept_name=c_label,
            simplified_explanation=mod.get("simplified_explanation", ""),
            analogy=mod.get("analogy", ""),
            practical_application=mod.get("practical_application", ""),
            misconception_analysis=mod.get("misconception_analysis", ""),
            practice_prompts=mod.get("practice_prompts", [])
        )
        db.add(revision_entry)

        modules.append(
            RevisionModule(
                concept_id=cid,
                concept_label=c_label,
                simplified_explanation=mod.get("simplified_explanation", ""),
                analogy=mod.get("analogy", ""),
                practical_application=mod.get("practical_application", ""),
                misconception_analysis=mod.get("misconception_analysis", ""),
                correct_mental_model=mod.get("correct_mental_model", ""),
                practice_prompts=mod.get("practice_prompts", [])
            )
        )

    db.commit()

    return RevisionResponse(
        session_id=session_id,
        topic=session.topic,
        modules=modules
    )

def generate_retest_questions(
    db: Session,
    session_id: str,
    target_concept_ids: Optional[List[str]] = None
) -> List[ClientQuestionItem]:
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    query = db.query(Concept).filter(Concept.session_id == session_id)
    if target_concept_ids:
        query = query.filter(Concept.id.in_(target_concept_ids))
    else:
        query = query.filter(Concept.status_tier.in_(["novice", "developing"]))

    concepts = query.all()
    if not concepts:
        concepts = db.query(Concept).filter(Concept.session_id == session_id).limit(3).all()

    weak_concept_data = [{"id": c.id, "label": c.label, "description": c.description} for c in concepts]

    prompt = build_retest_prompt(session.topic, weak_concept_data, count=max(3, len(concepts) * 2))
    ai_result = gemini_client.generate_json(prompt, system_instruction=SYSTEM_INSTRUCTION)
    raw_questions = ai_result.get("questions", [])

    client_questions: List[ClientQuestionItem] = []
    for idx, q in enumerate(raw_questions):
        qid = f"retest_{session_id[:8]}_{uuid.uuid4().hex[:12]}"
        cid = q.get("concept_id")
        qtype = q.get("question_type", "mcq")
        qtext = q.get("question_text", "")
        options = q.get("options") or []
        diff = q.get("difficulty", "medium")
        rubric = q.get("reference_rubric", "Correct understanding required.")

        if not isinstance(options, list):
            options = []
        

        c_obj = next((c for c in concepts if c.id == cid), None)
        c_label = c_obj.label if c_obj else cid

        db_q = Question(
            id=qid,
            session_id=session_id,
            concept_id=cid,
            question_type=qtype,
            question_text=qtext,
            options=options,
            reference_rubric=rubric,
            difficulty=diff,
            is_retest=True
        )
        db.add(db_q)

        client_questions.append(
            ClientQuestionItem(
                id=qid,
                concept_id=cid,
                concept_label=c_label,
                question_type=qtype,
                question_text=qtext,
                options=options,
                difficulty=diff,
                is_retest=True
            )
        )

    db.commit()
    return client_questions

def evaluate_retest_and_compare(
    db: Session,
    session_id: str,
    submission: AnswerSubmissionRequest
) -> RetestCompareResponse:
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Calculate pre-retest average score from initial answers (where is_retest is False)
    initial_answers = (
        db.query(StudentAnswer)
        .filter(StudentAnswer.session_id == session_id, StudentAnswer.is_retest == False)
        .all()
    )
    pre_avg = round(sum(a.score for a in initial_answers) / len(initial_answers)) if initial_answers else 0

    # Evaluate the retest submissions
    eval_summary = evaluate_student_answers(db, session_id, submission, is_retest=True)
    post_avg = eval_summary.overall_score
    delta = post_avg - pre_avg

    # Save to progress record
    mastered_count = len([c for c in eval_summary.concept_statuses if c.status_tier == "mastery"])
    total_count = len(eval_summary.concept_statuses)

    progress = ProgressRecord(
        session_id=session_id,
        topic=session.topic,
        initial_avg_score=pre_avg,
        retest_avg_score=post_avg,
        score_delta=delta,
        concepts_mastered=mastered_count,
        total_concepts=total_count
    )
    db.add(progress)
    db.commit()

    return RetestCompareResponse(
        session_id=session_id,
        topic=session.topic,
        pre_retest_avg=pre_avg,
        post_retest_avg=post_avg,
        improvement_delta=delta,
        mastery_improved=delta > 0,
        evaluations=eval_summary.evaluations,
        updated_concept_statuses=eval_summary.concept_statuses
    )
