from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class QuestionGenerateRequest(BaseModel):
    difficulty: Literal["beginner", "medium", "advanced"] = "medium"
    question_count: int = Field(5, ge=3, le=10)

class ClientQuestionItem(BaseModel):
    id: str = Field(..., description="Unique question ID")
    concept_id: str = Field(..., description="Associated concept ID")
    concept_label: Optional[str] = Field(None, description="Concept display name")
    question_type: Literal["mcq", "short_answer", "scenario", "why_how"] = "mcq"
    question_text: str
    options: List[str] = Field(default_factory=list, description="Options for MCQs (empty for short answer)")
    difficulty: str
    is_retest: bool = False

class QuestionnaireResponse(BaseModel):
    session_id: str
    topic: str
    questions: List[ClientQuestionItem]
