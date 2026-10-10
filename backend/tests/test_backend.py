import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.connection import get_db, SessionLocal
from backend.models.db_models import LearningSession, Concept
from backend.services.document_parser import clean_extracted_text, extract_text_from_txt

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "MindWeave API"

def test_text_cleaning():
    raw = "Hello   world!\r\n\r\n\r\nThis is    MindWeave.\n"
    cleaned = clean_extracted_text(raw)
    assert "Hello world!" in cleaned
    assert "This is MindWeave." in cleaned

def test_txt_extraction():
    sample = b"Database Management Systems\nIntroduction to Relational Models"
    extracted = extract_text_from_txt(sample)
    assert "Database Management Systems" in extracted

def test_db_session_and_concept():
    db = SessionLocal()
    session = LearningSession(
        topic="Test DBMS",
        source_type="topic",
        overview="Overview of database test"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    concept = Concept(
        id="test_concept_1",
        session_id=session.id,
        label="Relational Tables",
        description="Core unit of relational data",
        explanation="Tables store structured tuples.",
        examples=["Users table", "Orders table"],
        mastery_score=85,
        status_tier="mastery"
    )
    db.add(concept)
    db.commit()

    # Query back
    saved_concept = db.query(Concept).filter(Concept.id == "test_concept_1").first()
    assert saved_concept is not None
    assert saved_concept.label == "Relational Tables"
    assert saved_concept.mastery_score == 85

    # Cleanup test data
    db.delete(concept)
    db.delete(session)
    db.commit()
    db.close()
