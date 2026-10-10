from typing import List, Dict
from sqlalchemy.orm import Session
from backend.models.db_models import Concept, StudentAnswer, Question
from backend.schemas.evaluation import ConceptMasteryStatus

def compute_concept_mastery(db: Session, session_id: str) -> List[ConceptMasteryStatus]:
    """
    Computes grounded concept mastery scores from evaluated student answers.
    Updates concept records in the database.
    """
    concepts = db.query(Concept).filter(Concept.session_id == session_id).all()
    concept_statuses: List[ConceptMasteryStatus] = []

    for concept in concepts:
        # Find all answers for questions associated with this concept in this session
        answers = (
            db.query(StudentAnswer)
            .filter(
                StudentAnswer.session_id == session_id,
                StudentAnswer.concept_id == concept.id
            )
            .all()
        )

        if not answers:
            concept_statuses.append(
                ConceptMasteryStatus(
                    concept_id=concept.id,
                    label=concept.label,
                    score=0,
                    status_tier="unassessed",
                    misconceptions=[],
                    needs_revision=False
                )
            )
            continue

        # Calculate average score for assessed questions
        total_score = sum(ans.score for ans in answers)
        avg_score = round(total_score / len(answers))

        # Collect unique misconceptions
        misconceptions = [
            ans.misconception for ans in answers 
            if ans.misconception and ans.misconception.lower() != "null" and ans.misconception.strip()
        ]
        # Deduplicate
        unique_misconceptions = list(dict.fromkeys(misconceptions))

        # Determine status tier based on actual score and misconceptions
        if avg_score >= 75 and len(unique_misconceptions) == 0:
            tier = "mastery"
            needs_revision = False
        elif avg_score >= 50:
            tier = "developing"
            needs_revision = True
        else:
            tier = "novice"
            needs_revision = True

        # Update database record
        concept.mastery_score = avg_score
        concept.status_tier = tier
        concept.assessed_count = len(answers)
        db.add(concept)

        concept_statuses.append(
            ConceptMasteryStatus(
                concept_id=concept.id,
                label=concept.label,
                score=avg_score,
                status_tier=tier,
                misconceptions=unique_misconceptions,
                needs_revision=needs_revision
            )
        )

    db.commit()
    return concept_statuses
