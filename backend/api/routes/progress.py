from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from backend.database.connection import get_db
from backend.models.db_models import ProgressRecord, LearningSession

router = APIRouter(prefix="/progress", tags=["Progress Tracking"])

class ProgressItem(BaseModel):
    id: str
    session_id: str
    topic: str
    initial_avg_score: int
    retest_avg_score: Optional[int] = None
    score_delta: Optional[int] = None
    concepts_mastered: int
    total_concepts: int
    completed_at: datetime

@router.get("/history", response_model=List[ProgressItem])
def get_progress_history(db: Session = Depends(get_db)):
    """
    Returns verified history of student progress, retests, and mastery growth across sessions.
    """
    records = db.query(ProgressRecord).order_by(ProgressRecord.completed_at.desc()).limit(50).all()
    return [
        ProgressItem(
            id=r.id,
            session_id=r.session_id,
            topic=r.topic,
            initial_avg_score=r.initial_avg_score,
            retest_avg_score=r.retest_avg_score,
            score_delta=r.score_delta,
            concepts_mastered=r.concepts_mastered,
            total_concepts=r.total_concepts,
            completed_at=r.completed_at
        )
        for r in records
    ]
