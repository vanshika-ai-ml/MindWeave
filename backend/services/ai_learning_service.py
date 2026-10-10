import logging
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models.db_models import LearningSession, Concept, ConceptRelationship
from backend.schemas.session import LearningSessionResponse, ConceptItem, RelationshipItem
from backend.ai.gemini_client import gemini_client
from backend.ai.prompts import SYSTEM_INSTRUCTION, build_topic_analysis_prompt

logger = logging.getLogger("mindweave.service.learning")

def generate_and_save_session(
    db: Session,
    topic: str,
    source_type: str = "topic",
    document_context: str = ""
) -> LearningSessionResponse:
    prompt = build_topic_analysis_prompt(topic, document_context)
    ai_data = gemini_client.generate_json(prompt, system_instruction=SYSTEM_INSTRUCTION)

    overview = ai_data.get("overview", f"Comprehensive structured study path for {topic}.")
    concepts_raw = ai_data.get("concepts", [])
    relationships_raw = ai_data.get("relationships", [])

    # Create session in DB
    session = LearningSession(
        topic=topic,
        source_type=source_type,
        overview=overview
    )
    db.add(session)
    db.flush()  # Generates session.id

    # Create concepts in DB
    concept_items: List[ConceptItem] = []
    concept_id_map = {}

    for idx, c in enumerate(concepts_raw):
        # Ensure unique, safe slug
        raw_id = str(c.get("id") or f"concept_{idx}").strip().lower().replace(" ", "_")
        label = c.get("label", f"Concept {idx + 1}")
        description = c.get("description", "")
        explanation = c.get("explanation", description)
        examples = c.get("examples", [])
        prerequisites = c.get("prerequisites", [])

        concept = Concept(
            id=raw_id,
            session_id=session.id,
            label=label,
            description=description,
            explanation=explanation,
            examples=examples,
            prerequisites=prerequisites,
            mastery_score=None,
            status_tier="unassessed"
        )
        db.add(concept)
        concept_id_map[raw_id] = concept

        concept_items.append(
            ConceptItem(
                id=raw_id,
                label=label,
                description=description,
                explanation=explanation,
                examples=examples,
                prerequisites=prerequisites,
                mastery_score=None,
                status_tier="unassessed"
            )
        )

    # Create relationships in DB
    relationship_items: List[RelationshipItem] = []
    for r in relationships_raw:
        src = str(r.get("source", "")).strip().lower().replace(" ", "_")
        tgt = str(r.get("target", "")).strip().lower().replace(" ", "_")
        rel_type = r.get("relationship", "prerequisite")

        # Validate that both concepts exist
        if src in concept_id_map and tgt in concept_id_map and src != tgt:
            rel = ConceptRelationship(
                session_id=session.id,
                source_id=src,
                target_id=tgt,
                relationship_type=rel_type
            )
            db.add(rel)
            relationship_items.append(
                RelationshipItem(source=src, target=tgt, relationship=rel_type)
            )

    db.commit()
    db.refresh(session)

    return LearningSessionResponse(
        session_id=session.id,
        topic=session.topic,
        source_type=session.source_type,
        overview=session.overview,
        concepts=concept_items,
        relationships=relationship_items,
        created_at=session.created_at
    )
