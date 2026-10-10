from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class StudentAnswerInput(BaseModel):
    question_id: str = Field(..., description="The ID of the question being answered")
    student_answer: str = Field(..., min_length=1, description="Student's response text or chosen option")

class AnswerSubmissionRequest(BaseModel):
    answers: List[StudentAnswerInput] = Field(..., min_length=1, description="List of student answers")

class QuestionEvaluationResult(BaseModel):
    question_id: str
    concept_id: str
    concept_label: Optional[str] = None
    question_text: str
    student_answer: str
    score: int = Field(..., ge=0, le=100)
    correctness: Literal["correct", "partially_correct", "incorrect"]
    understanding_level: Literal["novice", "developing", "proficient", "mastery"]
    feedback: str
    misconception: Optional[str] = None
    suggested_correction: Optional[str] = None

class ConceptMasteryStatus(BaseModel):
    concept_id: str
    label: str
    score: int
    status_tier: Literal["mastery", "developing", "novice", "unassessed"]
    misconceptions: List[str] = Field(default_factory=list)
    needs_revision: bool = False

class EvaluationSummaryResponse(BaseModel):
    session_id: str
    overall_score: int
    evaluations: List[QuestionEvaluationResult]
    concept_statuses: List[ConceptMasteryStatus]
    weak_concept_ids: List[str]
    is_retest: bool = False
