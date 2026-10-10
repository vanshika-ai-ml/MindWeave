import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.revision import (
    RevisionRequest,
    RevisionResponse,
    RetestCompareResponse
)
from backend.schemas.question import ClientQuestionItem
from backend.schemas.evaluation import AnswerSubmissionRequest
from backend.services.revision_engine import (
    generate_revision_modules,
    generate_retest_questions,
    evaluate_retest_and_compare
)

logger = logging.getLogger("mindweave.routes.revision")
router = APIRouter(prefix="/sessions", tags=["Revision & Retest"])

@router.post("/{session_id}/revision", response_model=RevisionResponse)
def get_revision_modules(
    session_id: str,
    payload: RevisionRequest = RevisionRequest(),
    db: Session = Depends(get_db)
):
    """
    Generates personalized revision modules tailored specifically to weak concepts and detected misconceptions.
    """
    try:
        return generate_revision_modules(db, session_id, payload.concept_ids)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating revision for session '{session_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate revision modules: {str(e)}")

@router.post("/{session_id}/retest", response_model=List[ClientQuestionItem])
def get_retest_questions(
    session_id: str,
    payload: RevisionRequest = RevisionRequest(),
    db: Session = Depends(get_db)
):
    """
    Generates fresh retest questions targeting the concepts that needed revision.
    """
    try:
        return generate_retest_questions(db, session_id, payload.concept_ids)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating retest questions for session '{session_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate retest: {str(e)}")

@router.post("/{session_id}/retest-evaluate", response_model=RetestCompareResponse)
def evaluate_retest(
    session_id: str,
    payload: AnswerSubmissionRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates retest submissions, compares post-retest score with pre-revision score, and updates progress.
    """
    try:
        return evaluate_retest_and_compare(db, session_id, payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating retest for session '{session_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate retest: {str(e)}")
