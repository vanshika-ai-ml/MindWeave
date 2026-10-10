from pydantic import BaseModel, Field
from typing import List, Optional
from backend.schemas.evaluation import QuestionEvaluationResult, ConceptMasteryStatus

class RevisionRequest(BaseModel):
    concept_ids: Optional[List[str]] = Field(None, description="Specific concept IDs to revise; if empty, all weak concepts are revised")

class RevisionModule(BaseModel):
    concept_id: str
    concept_label: str
    simplified_explanation: str
    analogy: str
    practical_application: str
    misconception_analysis: str
    correct_mental_model: str
    practice_prompts: List[str] = Field(default_factory=list)

class RevisionResponse(BaseModel):
    session_id: str
    topic: str
    modules: List[RevisionModule]

class RetestCompareResponse(BaseModel):
    session_id: str
    topic: str
    pre_retest_avg: int
    post_retest_avg: int
    improvement_delta: int
    mastery_improved: bool
    evaluations: List[QuestionEvaluationResult]
    updated_concept_statuses: List[ConceptMasteryStatus]
