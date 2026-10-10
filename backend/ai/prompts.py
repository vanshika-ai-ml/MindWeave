import json

SYSTEM_INSTRUCTION = """You are MindWeave, an advanced AI pedagogical engine specializing in conceptual breakdown, knowledge graph modeling, diagnostic assessment, and misconception detection.
Your goal is not merely to grade students, but to uncover what they actually understand and identify cognitive misunderstandings.
Always produce strict, schema-compliant JSON without extraneous commentary."""

def build_topic_analysis_prompt(topic: str, context_text: str = "") -> str:
    context_section = f"\nAdditional Source Material Context:\n{context_text[:5000]}\n" if context_text else ""
    return f"""Analyze the subject "{topic}" and generate a comprehensive, structured learning path and concept map.
{context_section}
Requirements:
1. Provide a clear, engaging topic overview (2-4 paragraphs) explaining what this topic is, why it matters, and real-world relevance.
2. Identify between 6 to 9 essential concepts.
3. For each concept:
   - id: lowercase snake_case unique slug (e.g., "dbms_joins", "sql_indexing")
   - label: Clear concise title (e.g., "Relational Joins", "B-Tree Indexing")
   - description: 1-2 sentence core definition
   - explanation: 2-3 detailed paragraphs breaking down the mechanics and principles from first principles
   - examples: 2-3 concrete real-world examples or code scenarios
   - prerequisites: list of concept IDs (from this set) that must be learned first
4. Identify directed relationships between concepts:
   - source: concept_id
   - target: concept_id (where source leads to target or source is prerequisite for target)
   - relationship: "prerequisite" | "depends_on" | "relates_to"

Output JSON Structure:
{{
  "topic": "{topic}",
  "overview": "Comprehensive topic introduction...",
  "concepts": [
    {{
      "id": "concept_id",
      "label": "Concept Name",
      "description": "Short definition",
      "explanation": "In-depth explanation...",
      "examples": ["Example 1", "Example 2"],
      "prerequisites": ["other_concept_id"]
    }}
  ],
  "relationships": [
    {{
      "source": "concept_id",
      "target": "concept_id",
      "relationship": "prerequisite"
    }}
  ]
}}
"""

def build_question_generation_prompt(topic: str, concepts_data: list, question_count: int = 6, difficulty: str = "medium") -> str:
    concepts_summary = [{"id": c["id"], "label": c["label"], "description": c["description"]} for c in concepts_data]
    return f"""You are generating an adaptive diagnostic questionnaire for the topic "{topic}".
Difficulty level: {difficulty}.
Target question count: {question_count}.

Concepts available:
{json.dumps(concepts_summary, indent=2)}

Requirements:
1. Cover the key concepts fairly across the set.
2. Mix question types:
   - "mcq": Multiple Choice Question with 4 distinct options (one unambiguously correct, three plausible distractors reflecting common student misunderstandings).
   - "short_answer": Conceptual explain-in-your-own-words question (e.g., "Explain why...", "How does...").
   - "scenario": Practical scenario/debugging question (e.g., "Given this scenario, what happens when...").
3. For EVERY question provide:
   - id: unique string, e.g., "q_1", "q_2"
   - concept_id: exactly matching one of the provided concept IDs
   - question_type: "mcq" | "short_answer" | "scenario"
   - question_text: clear question prompt
   - options: list of 4 strings if question_type is "mcq", empty list [] if short_answer/scenario
   - difficulty: "beginner" | "medium" | "advanced"
   - reference_rubric: clear criteria of what makes an answer correct, the underlying reasoning, and what typical pitfalls/misconceptions look like. (This will be kept strictly on the server).

Output JSON Structure:
{{
  "questions": [
    {{
      "id": "q_1",
      "concept_id": "concept_id",
      "question_type": "mcq",
      "question_text": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "difficulty": "{difficulty}",
      "reference_rubric": "Correct answer is Option B because... Distractor A represents misconception..."
    }}
  ]
}}
"""

def build_answer_evaluation_prompt(evaluation_batch: list) -> str:
    return f"""You are the MindWeave Diagnostic Evaluation and Misconception Engine.
Evaluate the following student answers against the server reference rubrics.

Evaluation Items:
{json.dumps(evaluation_batch, indent=2)}

For each submission:
1. Score from 0 to 100 based on genuine conceptual understanding:
   - 90-100: Mastery / complete and accurate
   - 70-89: Proficient / minor detail omitted but core model is sound
   - 45-69: Partially correct / developing understanding, but contains a misconception or key gap
   - 0-44: Incorrect / significant misconception or fundamentally flawed reasoning
2. Correctness: "correct" | "partially_correct" | "incorrect"
3. Understanding Level: "mastery" | "proficient" | "developing" | "novice"
4. Feedback: Constructive, friendly, 2-3 sentence explanation of the strengths and weaknesses of the student's answer.
5. Misconception: If the student demonstrated an inaccurate mental model, specifically describe the misconception (e.g., "Confusing table joins with set unions", "Assuming indexes guarantee faster write operations"). If the answer was simply incomplete without false beliefs, state null.
6. Suggested Correction: 1-2 sentence clarification highlighting the true principle.

Output JSON Structure:
{{
  "evaluations": [
    {{
      "question_id": "q_id",
      "concept_id": "concept_id",
      "score": 75,
      "correctness": "partially_correct",
      "understanding_level": "developing",
      "feedback": "Your explanation captures...",
      "misconception": "Confusing join behavior with...",
      "suggested_correction": "Remember that..."
    }}
  ]
}}
"""

def build_revision_prompt(topic: str, weak_concepts: list) -> str:
    return f"""You are the MindWeave Personalized Remediation Engine for the topic "{topic}".
The student has demonstrated confusion or scored low on the following concept(s):
{json.dumps(weak_concepts, indent=2)}

For each weak concept, build a targeted personalized revision module:
1. simplified_explanation: Break the concept down to absolute first principles using plain language without jargon overload.
2. analogy: An intuitive real-world or everyday physical analogy (e.g., comparing database indexes to a library card catalog).
3. practical_application: How this concept is used in actual software development / production systems.
4. misconception_analysis: Why students commonly get confused about this, highlighting the common faulty mental model.
5. correct_mental_model: The step-by-step correct way to think about it.
6. practice_prompts: 2 self-check reflection questions or mini thought experiments.

Output JSON Structure:
{{
  "modules": [
    {{
      "concept_id": "concept_id",
      "concept_label": "Concept Name",
      "simplified_explanation": "...",
      "analogy": "...",
      "practical_application": "...",
      "misconception_analysis": "...",
      "correct_mental_model": "...",
      "practice_prompts": ["Prompt 1", "Prompt 2"]
    }}
  ]
}}
"""

def build_retest_prompt(topic: str, weak_concepts: list, count: int = 4) -> str:
    return f"""Generate fresh, targeted retest questions for the student on topic "{topic}".
Target weak concepts:
{json.dumps(weak_concepts, indent=2)}

Requirements:
1. Generate {count} NEW questions specifically targeting the concepts where the student previously stumbled.
2. DO NOT repeat identical questions from earlier. Formulate fresh scenarios or angle the questions to test if the previous misconceptions have been resolved.
3. Mix "mcq" and "short_answer".
4. Provide the server reference rubric for each.

Output JSON Structure:
{{
  "questions": [
    {{
      "id": "retest_q_1",
      "concept_id": "concept_id",
      "question_type": "mcq",
      "question_text": "Fresh question...",
      "options": ["A", "B", "C", "D"],
      "difficulty": "medium",
      "reference_rubric": "..."
    }}
  ]
}}
"""
