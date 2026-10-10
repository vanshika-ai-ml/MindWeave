from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class TopicCreateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=150, description="The topic to analyze and learn")

class ConceptItem(BaseModel):
    id: str = Field(..., description="Stable slug for the concept, e.g., 'dbms_joins'")
    label: str = Field(..., description="Display title of the concept")
    description: str = Field(..., description="Short one-line summary")
    explanation: Optional[str] = Field(None, description="Detailed explanation")
    examples: List[str] = Field(default_factory=list, description="Practical real-world examples")
    prerequisites: List[str] = Field(default_factory=list, description="IDs of prerequisite concepts")
    mastery_score: Optional[int] = Field(None, description="Current mastery score from 0-100")
    status_tier: str = Field("unassessed", description="'unassessed', 'mastery', 'developing', or 'novice'")

class RelationshipItem(BaseModel):
    source: str = Field(..., description="Source concept ID")
    target: str = Field(..., description="Target concept ID")
    relationship: Literal["prerequisite", "depends_on", "relates_to"] = Field("prerequisite", description="Relationship type")

class LearningSessionResponse(BaseModel):
    session_id: str
    topic: str
    source_type: str
    overview: str
    concepts: List[ConceptItem]
    relationships: List[RelationshipItem]
    created_at: datetime

class SessionSummaryResponse(BaseModel):
    session_id: str
    topic: str
    source_type: str
    concept_count: int
    created_at: datetime
    has_evaluation: bool
    overall_mastery: Optional[int] = None
