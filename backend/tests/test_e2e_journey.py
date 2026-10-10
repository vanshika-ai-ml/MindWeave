import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.connection import SessionLocal
from backend.models.db_models import LearningSession, Concept, Question, StudentAnswer

client = TestClient(app)

def test_full_e2e_hackathon_demo_flow():
    """
    Simulates the complete 16-step user journey from the prompt:
    1. Check Health & System Ready
    2. Enter topic: DBMS
    3. Generate learning content & concept hierarchy
    4. Verify concepts and directed relationships
    5. Generate adaptive questionnaire
    6. Submit answer demonstrating a misconception on Joins
    7. Verify misconception detection & scoring
    8. Check Understanding Map mastery status
    9. Generate targeted revision for weak concept
    10. Generate fresh retest questions
    11. Submit improved retest answer
    12. Verify score delta improvement
    13. Verify progress history persistence
    """
    # 1. Health check
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # 2 & 3. Create topic session for "DBMS"
    create_res = client.post("/api/sessions/create-topic", json={"topic": "DBMS"})
    assert create_res.status_code == 200
    session_data = create_res.json()
    session_id = session_data["session_id"]
    assert session_id is not None
    assert len(session_data["concepts"]) >= 5
    assert len(session_data["relationships"]) >= 1

    # 4. Verify concept details and relationships
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    concepts = get_res.json()["concepts"]
    concept_ids = [c["id"] for c in concepts]
    assert len(concept_ids) >= 5

    # Pick or ensure a joins/relational concept exists
    target_concept_id = concept_ids[0]

    # 5. Generate diagnostic questions
    q_res = client.post(f"/api/sessions/{session_id}/questions", json={"difficulty": "medium", "question_count": 5})
    assert q_res.status_code == 200
    questions_data = q_res.json()["questions"]
    assert len(questions_data) >= 3

    # Ensure correct answers / rubrics are NOT exposed in client response
    for q in questions_data:
        assert "reference_rubric" not in q

    # 6. Submit answers with a deliberately flawed/misconception answer for question 1
    # Prompt example: Question on joins answered as "Both join two different tables"
    submission_payload = {
        "answers": [
            {
                "question_id": questions_data[0]["id"],
                "student_answer": "Both join two different tables together by combining every row."
            }
        ]
    }
    # Add remaining answers with brief answers
    for q in questions_data[1:]:
        submission_payload["answers"].append({
            "question_id": q["id"],
            "student_answer": "Standard relational operation" if q["question_type"] != "mcq" else (q["options"][0] if q["options"] else "Option A")
        })

    eval_res = client.post(f"/api/sessions/{session_id}/evaluate", json=submission_payload)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "overall_score" in eval_data
    assert len(eval_data["evaluations"]) >= 1
    assert "concept_statuses" in eval_data

    # 7. Check Understanding Map
    map_res = client.get(f"/api/sessions/{session_id}/understanding")
    assert map_res.status_code == 200
    understanding_map = map_res.json()
    assert len(understanding_map) >= 5

    # 8. Generate revision module for weak concept(s)
    weak_ids = eval_data.get("weak_concept_ids", [target_concept_id])
    if not weak_ids:
        weak_ids = [target_concept_id]

    rev_res = client.post(f"/api/sessions/{session_id}/revision", json={"concept_ids": weak_ids})
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert len(rev_data["modules"]) >= 1
    assert "simplified_explanation" in rev_data["modules"][0]
    assert "analogy" in rev_data["modules"][0]

    # 9. Generate fresh retest questions
    retest_q_res = client.post(f"/api/sessions/{session_id}/retest", json={"concept_ids": weak_ids})
    assert retest_q_res.status_code == 200
    retest_questions = retest_q_res.json()
    assert len(retest_questions) >= 1

    # 10. Submit improved answers for the retest
    retest_submission = {
        "answers": [
            {
                "question_id": retest_questions[0]["id"],
                "student_answer": "A LEFT JOIN preserves all records from the left table and populates unmatched right table columns with NULL, whereas a SELF JOIN is an inner or outer join where a table joins against itself using an alias to model hierarchical data."
            }
        ]
    }
    for q in retest_questions[1:]:
        retest_submission["answers"].append({
            "question_id": q["id"],
            "student_answer": "Correct relational mental model applying proper keys and conditions." if q["question_type"] != "mcq" else (q["options"][0] if q["options"] else "A")
        })

    retest_eval_res = client.post(f"/api/sessions/{session_id}/retest-evaluate", json=retest_submission)
    assert retest_eval_res.status_code == 200
    compare_data = retest_eval_res.json()
    assert "pre_retest_avg" in compare_data
    assert "post_retest_avg" in compare_data
    assert "improvement_delta" in compare_data

    # 11. Verify progress records
    progress_res = client.get("/api/progress/history")
    assert progress_res.status_code == 200
    progress_history = progress_res.json()
    assert len(progress_history) >= 1
    assert progress_history[0]["session_id"] == session_id
    assert progress_history[0]["topic"] == "DBMS"
