import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    topic = Column(String(255), nullable=False)
    source_type = Column(String(50), default="topic")  # "topic" or "upload"
    overview = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    concepts = relationship("Concept", back_populates="session", cascade="all, delete-orphan")
    relationships = relationship("ConceptRelationship", back_populates="session", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("StudentAnswer", back_populates="session", cascade="all, delete-orphan")
    revisions = relationship("RevisionLog", back_populates="session", cascade="all, delete-orphan")
    progress_records = relationship("ProgressRecord", back_populates="session", cascade="all, delete-orphan")

class Concept(Base):
    __tablename__ = "concepts"

    id = Column(String(100), primary_key=True)  # stable slug, e.g., "dbms_joins"
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    examples = Column(JSON, nullable=True, default=list)
    prerequisites = Column(JSON, nullable=True, default=list)
    mastery_score = Column(Integer, nullable=True, default=None)  # None = unassessed, 0-100 once assessed
    status_tier = Column(String(50), default="unassessed")  # unassessed, mastery, developing, novice
    assessed_count = Column(Integer, default=0)

    session = relationship("LearningSession", back_populates="concepts")
    questions = relationship("Question", back_populates="concept", cascade="all, delete-orphan")

class ConceptRelationship(Base):
    __tablename__ = "concept_relationships"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    relationship_type = Column(String(50), default="prerequisite")  # prerequisite, depends_on, relates_to

    session = relationship("LearningSession", back_populates="relationships")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(100), primary_key=True)  # stable question id
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    concept_id = Column(String(100), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    question_type = Column(String(50), nullable=False)  # mcq, short_answer, scenario, why_how
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True, default=list)  # for MCQs: list of strings
    reference_rubric = Column(Text, nullable=False)  # NEVER exposed to frontend
    difficulty = Column(String(50), default="medium")  # beginner, medium, advanced
    is_retest = Column(Boolean, default=False)

    session = relationship("LearningSession", back_populates="questions")
    concept = relationship("Concept", back_populates="questions")
    answers = relationship("StudentAnswer", back_populates="question", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(100), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    concept_id = Column(String(100), nullable=False)
    student_answer = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)  # 0 to 100
    correctness = Column(String(50), nullable=False)  # correct, partially_correct, incorrect
    understanding_level = Column(String(50), nullable=False)  # novice, developing, proficient, mastery
    feedback = Column(Text, nullable=False)
    misconception = Column(Text, nullable=True)  # detected cognitive flaw
    suggested_correction = Column(Text, nullable=True)
    is_retest = Column(Boolean, default=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LearningSession", back_populates="answers")
    question = relationship("Question", back_populates="answers")

class RevisionLog(Base):
    __tablename__ = "revision_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    concept_id = Column(String(100), nullable=False)
    concept_name = Column(String(255), nullable=True)
    simplified_explanation = Column(Text, nullable=False)
    analogy = Column(Text, nullable=False)
    practical_application = Column(Text, nullable=False)
    misconception_analysis = Column(Text, nullable=False)
    practice_prompts = Column(JSON, nullable=True, default=list)
    generated_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LearningSession", back_populates="revisions")

class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("learning_sessions.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(255), nullable=False)
    initial_avg_score = Column(Integer, nullable=False)
    retest_avg_score = Column(Integer, nullable=True)
    score_delta = Column(Integer, nullable=True)
    concepts_mastered = Column(Integer, default=0)
    total_concepts = Column(Integer, default=0)
    completed_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LearningSession", back_populates="progress_records")
