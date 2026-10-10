import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.db_models import LearningSession, Concept, ConceptRelationship
from backend.schemas.session import (
    TopicCreateRequest,
    LearningSessionResponse,
    ConceptItem,
    RelationshipItem,
    SessionSummaryResponse
)
from backend.services.ai_learning_service import generate_and_save_session
from backend.services.document_parser import parse_and_validate_upload

logger = logging.getLogger("mindweave.routes.sessions")
router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/create-topic", response_model=LearningSessionResponse)
def create_topic_session(payload: TopicCreateRequest, db: Session = Depends(get_db)):
    """
    Creates a new learning session from a user-supplied topic.
    """
    try:
        return generate_and_save_session(db, topic=payload.topic, source_type="topic")
    except Exception as e:
        logger.error(f"Error creating session for topic '{payload.topic}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate learning path: {str(e)}")

@router.post("/upload-material", response_model=LearningSessionResponse)
async def upload_document_session(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Extracts text from PDF/DOCX/TXT file and generates a structured learning session.
    """
    filename, extracted_text = await parse_and_validate_upload(file)
    topic_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
    try:
        return generate_and_save_session(
            db,
            topic=topic_name,
            source_type="upload",
            document_context=extracted_text
        )
    except Exception as e:
        logger.error(f"Error generating session from upload '{filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process material: {str(e)}")

@router.get("/{session_id}", response_model=LearningSessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieves a complete learning session with concepts and relationships.
    """
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found.")

    concepts = db.query(Concept).filter(Concept.session_id == session_id).all()
    relationships = db.query(ConceptRelationship).filter(ConceptRelationship.session_id == session_id).all()

    return LearningSessionResponse(
        session_id=session.id,
        topic=session.topic,
        source_type=session.source_type,
        overview=session.overview or "",
        concepts=[
            ConceptItem(
                id=c.id,
                label=c.label,
                description=c.description,
                explanation=c.explanation,
                examples=c.examples or [],
                prerequisites=c.prerequisites or [],
                mastery_score=c.mastery_score,
                status_tier=c.status_tier or "unassessed"
            ) for c in concepts
        ],
        relationships=[
            RelationshipItem(
                source=r.source_id,
                target=r.target_id,
                relationship=r.relationship_type
            ) for r in relationships
        ],
        created_at=session.created_at
    )

@router.get("", response_model=List[SessionSummaryResponse])
def list_sessions(db: Session = Depends(get_db)):
    """
    Lists all saved learning sessions.
    """
    sessions = db.query(LearningSession).order_by(LearningSession.created_at.desc()).limit(20).all()
    summaries = []
    for s in sessions:
        concept_count = db.query(Concept).filter(Concept.session_id == s.id).count()
        assessed_concepts = (
            db.query(Concept)
            .filter(Concept.session_id == s.id, Concept.mastery_score.isnot(None))
            .all()
        )
        has_eval = len(assessed_concepts) > 0
        overall = (
            round(sum(c.mastery_score for c in assessed_concepts) / len(assessed_concepts))
            if has_eval else None
        )

        summaries.append(
            SessionSummaryResponse(
                session_id=s.id,
                topic=s.topic,
                source_type=s.source_type,
                concept_count=concept_count,
                created_at=s.created_at,
                has_evaluation=has_eval,
                overall_mastery=overall
            )
        )
    return summaries
