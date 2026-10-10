import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.evaluation import (
    AnswerSubmissionRequest,
    EvaluationSummaryResponse,
    ConceptMasteryStatus
)
from backend.services.evaluation_service import evaluate_student_answers
from backend.services.understanding_engine import compute_concept_mastery

logger = logging.getLogger("mindweave.routes.evaluation")
router = APIRouter(prefix="/sessions", tags=["Evaluation"])

@router.post("/{session_id}/evaluate", response_model=EvaluationSummaryResponse)
def submit_and_evaluate_answers(
    session_id: str,
    payload: AnswerSubmissionRequest,
    db: Session = Depends(get_db)
):
    """
    Submits student answers for evaluation.
    Evaluates semantic correctness and diagnoses misconceptions using Gemini.
    """
    try:
        return evaluate_student_answers(db, session_id, payload, is_retest=False)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating answers for session '{session_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate answers: {str(e)}")

@router.get("/{session_id}/understanding", response_model=List[ConceptMasteryStatus])
def get_understanding_map(session_id: str, db: Session = Depends(get_db)):
    """
    Returns the real assessed concept mastery scores, status tiers, and detected misconceptions.
    """
    try:
        return compute_concept_mastery(db, session_id)
    except Exception as e:
        logger.error(f"Error computing understanding map for session '{session_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate understanding map: {str(e)}")
