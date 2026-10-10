"""
Local integration tests for MindWeave non-AI endpoints.
Seeds a test session directly into the database and verifies all endpoints
that do NOT require a live Gemini API call.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.connection import SessionLocal
from backend.models.db_models import (
    LearningSession, Concept, ConceptRelationship,
    Question, StudentAnswer
)

client = TestClient(app)

TEST_SESSION_ID = None  # Set by fixture


@pytest.fixture(scope="module")
def seeded_session():
    """Creates a complete local test session with concepts, relationships, questions, and answers."""
    db = SessionLocal()
    sid = str(uuid.uuid4())

    # Create session
    sess = LearningSession(
        id=sid, topic="DBMS Local Test",
        source_type="topic",
        overview="Local test overview for DBMS. Covers relational model, SQL, joins, and normalization."
    )
    db.add(sess)
    db.flush()

    # Create concepts
    concepts = [
        Concept(id="dbms_intro", session_id=sid, label="Introduction to DBMS",
                description="Foundational concepts of database systems.", explanation="Detailed DBMS explanation.",
                examples=["MySQL", "PostgreSQL"], status_tier="mastery", mastery_score=88, assessed_count=2),
        Concept(id="relational_model", session_id=sid, label="Relational Model",
                description="Tables, rows and columns form the relational model.", explanation="Relational model details.",
                examples=["Customers table", "Orders table"], status_tier="mastery", mastery_score=82, assessed_count=2),
        Concept(id="sql_basics", session_id=sid, label="SQL Basics",
                description="Structured Query Language fundamentals.", explanation="SELECT, INSERT, UPDATE, DELETE.",
                examples=["SELECT * FROM users", "INSERT INTO orders"], status_tier="developing", mastery_score=65, assessed_count=2),
        Concept(id="joins", session_id=sid, label="SQL Joins",
                description="Combining rows from two or more tables.", explanation="INNER, LEFT, RIGHT, SELF joins.",
                examples=["LEFT JOIN users ON orders.user_id = users.id"], status_tier="novice", mastery_score=42, assessed_count=2),
        Concept(id="normalization", session_id=sid, label="Normalization",
                description="Eliminating redundancy through normal forms.", explanation="1NF, 2NF, 3NF, BCNF.",
                examples=["Splitting customer addresses into a separate table"], status_tier="unassessed", mastery_score=None, assessed_count=0),
    ]
    for c in concepts:
        db.add(c)

    # Create relationships
    rels = [
        ConceptRelationship(session_id=sid, source_id="dbms_intro", target_id="relational_model", relationship_type="prerequisite"),
        ConceptRelationship(session_id=sid, source_id="relational_model", target_id="sql_basics", relationship_type="prerequisite"),
        ConceptRelationship(session_id=sid, source_id="sql_basics", target_id="joins", relationship_type="depends_on"),
    ]
    for r in rels:
        db.add(r)

    # Create a question and student answer to test evaluation retrieval
    q = Question(
        id="q_local_1", session_id=sid, concept_id="joins",
        question_type="short_answer",
        question_text="Explain the difference between LEFT JOIN and SELF JOIN.",
        options=[], reference_rubric="LEFT JOIN retains unmatched left rows with NULL. SELF JOIN joins table to itself.",
        difficulty="medium", is_retest=False
    )
    db.add(q)

    ans = StudentAnswer(
        session_id=sid, question_id="q_local_1", concept_id="joins",
        student_answer="Both join two different tables together.",
        score=30, correctness="incorrect", understanding_level="novice",
        feedback="Your answer confuses join mechanics with table multiplicity.",
        misconception="Confusing join behavior with joining a table to itself.",
        suggested_correction="LEFT JOIN keeps all left rows; SELF JOIN uses aliases to join a table with itself.",
        is_retest=False
    )
    db.add(ans)

    db.commit()
    db.close()

    yield sid

    # Teardown — remove test data
    db = SessionLocal()
    sa = db.query(StudentAnswer).filter(StudentAnswer.session_id == sid).all()
    for s in sa:
        db.delete(s)
    qs = db.query(Question).filter(Question.session_id == sid).all()
    for q in qs:
        db.delete(q)
    rs = db.query(ConceptRelationship).filter(ConceptRelationship.session_id == sid).all()
    for r in rs:
        db.delete(r)
    cs = db.query(Concept).filter(Concept.session_id == sid).all()
    for c in cs:
        db.delete(c)
    db.query(LearningSession).filter(LearningSession.id == sid).delete()
    db.commit()
    db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Health & Startup
# ─────────────────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["service"] == "MindWeave API"
    assert "model" in data
    assert "database" in data


def test_list_sessions(seeded_session):
    r = client.get("/api/sessions")
    assert r.status_code == 200
    sessions = r.json()
    assert isinstance(sessions, list)
    assert any(s["session_id"] == seeded_session for s in sessions)


# ─────────────────────────────────────────────────────────────────────────────
# Session retrieval
# ─────────────────────────────────────────────────────────────────────────────

def test_get_session(seeded_session):
    r = client.get(f"/api/sessions/{seeded_session}")
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == seeded_session
    assert data["topic"] == "DBMS Local Test"
    assert len(data["concepts"]) == 5
    assert len(data["relationships"]) == 3


def test_get_session_not_found():
    r = client.get("/api/sessions/nonexistent-id-xyz")
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# Understanding map (no AI — uses DB scores)
# ─────────────────────────────────────────────────────────────────────────────

def test_understanding_map(seeded_session):
    r = client.get(f"/api/sessions/{seeded_session}/understanding")
    assert r.status_code == 200
    statuses = r.json()
    # 5 concepts seeded
    assert len(statuses) == 5

    by_id = {s["concept_id"]: s for s in statuses}

    # Verify mastery tiers based on seeded scores
    assert by_id["dbms_intro"]["status_tier"] == "mastery"
    assert by_id["joins"]["status_tier"] == "novice"
    assert by_id["normalization"]["status_tier"] == "unassessed"

    # Joins should be flagged for revision
    assert by_id["joins"]["needs_revision"] is True
    assert by_id["dbms_intro"]["needs_revision"] is False

    # Misconception detected on joins (from seeded student_answer)
    joins_misconceptions = by_id["joins"]["misconceptions"]
    assert len(joins_misconceptions) >= 1
    assert "Self Join" in joins_misconceptions[0] or "itself" in joins_misconceptions[0] or "join" in joins_misconceptions[0].lower()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic validation
# ─────────────────────────────────────────────────────────────────────────────

def test_pydantic_rejects_short_topic():
    r = client.post("/api/sessions/create-topic", json={"topic": "x"})
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert any(e["type"] == "string_too_short" for e in detail)


def test_pydantic_rejects_missing_topic():
    r = client.post("/api/sessions/create-topic", json={})
    assert r.status_code == 422


def test_pydantic_rejects_empty_answers(seeded_session):
    r = client.post(f"/api/sessions/{seeded_session}/evaluate", json={"answers": []})
    assert r.status_code == 422


def test_pydantic_rejects_blank_answer(seeded_session):
    r = client.post(f"/api/sessions/{seeded_session}/evaluate", json={
        "answers": [{"question_id": "q_local_1", "student_answer": ""}]
    })
    assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Progress history (no AI)
# ─────────────────────────────────────────────────────────────────────────────

def test_progress_history():
    r = client.get("/api/progress/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─────────────────────────────────────────────────────────────────────────────
# Document parsing (no AI, no network)
# ─────────────────────────────────────────────────────────────────────────────

def test_txt_extraction_clean():
    from backend.services.document_parser import extract_text_from_txt, clean_extracted_text
    raw = b"Database Systems\n\nA database is an organized collection of data."
    extracted = extract_text_from_txt(raw)
    assert "Database Systems" in extracted
    assert "organized collection" in extracted


def test_text_cleaning():
    from backend.services.document_parser import clean_extracted_text
    raw = "Hello   world!\r\n\r\n\r\nThis is   DBMS."
    cleaned = clean_extracted_text(raw)
    assert "\r\n" not in cleaned
    assert "   " not in cleaned
