"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import { QuestionnaireSubmissionSchema } from "../../lib/validation.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }
    setSessionId(activeId);

    // Fetch or generate questions
    api.generateQuestions(activeId, { difficulty: "medium", question_count: 5 })
      .then((data) => {
        setTopic(data.topic);
        setQuestions(data.questions || []);
        // Initialize answer keys
        const initial = {};
        (data.questions || []).forEach((q) => {
          initial[q.id] = "";
        });
        setUserAnswers(initial);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load questions");
        setLoading(false);
      });
  }, [querySessionId, router]);

  const handleSelectOption = (questionId, optionText) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionText
    }));
    setValidationErrors((prev) => ({ ...prev, [questionId]: null }));
  };

  const handleTextChange = (questionId, text) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: text
    }));
    setValidationErrors((prev) => ({ ...prev, [questionId]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    // Prepare payload
    const submissionBatch = questions.map((q) => ({
      questionId: q.id,
      conceptId: q.concept_id,
      studentAnswer: (userAnswers[q.id] || "").trim()
    }));

    // Client-side Zod validation
    const validation = QuestionnaireSubmissionSchema.safeParse({
      sessionId: sessionId,
      answers: submissionBatch
    });

    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        if (err.path && err.path[1] !== undefined) {
          const index = err.path[1];
          const qId = questions[index]?.id;
          if (qId) fieldErrors[qId] = "Please provide an answer for this question";
        }
      });
      setValidationErrors(fieldErrors);
      setError("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const evalResult = await api.submitAnswers(sessionId, submissionBatch);
      // Cache results in sessionStorage for instant analysis view
      sessionStorage.setItem(`mindweave_eval_${sessionId}`, JSON.stringify(evalResult));
      router.push(`/analysis?session_id=${sessionId}`);
    } catch (err) {
      setError(err.message || "Failed to submit answers.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating tailored diagnostic questions for your concepts..." dark />;
  }

  if (error && questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2 style={{ color: "var(--mastery-red)", marginBottom: "1rem" }}>Quiz Unavailable</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
        <Link href={`/dashboard?session_id=${sessionId}`} className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: "840px", margin: "0 auto" }}>
      {/* Quiz Header */}
      <div style={{ marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
          Adaptive Assessment
        </span>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 850, color: "var(--text-main)" }}>
          {topic} Diagnostic Test
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          Answer each question to discover your true conceptual understanding. MindWeave evaluates semantic depth and diagnoses hidden misconceptions.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "var(--mastery-red-bg)", border: "1px solid var(--mastery-red-border)", padding: "1rem", borderRadius: "var(--radius-md)", color: "var(--mastery-red-text)", marginBottom: "1.5rem", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {questions.map((q, idx) => {
          const currentAnswer = userAnswers[q.id] || "";
          const hasError = validationErrors[q.id];

          return (
            <div key={q.id} className="question-card" style={{ borderLeft: hasError ? "4px solid var(--mastery-red)" : "1px solid var(--border-subtle)" }}>
              <div className="question-meta">
                <span className="question-num">Question {idx + 1} of {questions.length}</span>
                <span className="badge badge-unassessed">📌 {q.concept_label}</span>
                <span className="badge badge-unassessed">{q.difficulty}</span>
              </div>

              <h2 className="question-prompt">{q.question_text}</h2>

              {q.question_type === "mcq" && q.options && q.options.length > 0 ? (
                <div className="options-list">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = currentAnswer === opt;
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={`option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectOption(q.id, opt)}
                        disabled={submitting}
                      >
                        <span className="option-letter">{letter}</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <textarea
                    className="form-textarea"
                    placeholder="Type your explanation in your own words. Explain the underlying 'why' and 'how'..."
                    value={currentAnswer}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    disabled={submitting}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.3rem", display: "block" }}>
                    Semantic evaluation tests understanding rather than rote keyword matching.
                  </span>
                </div>
              )}

              {hasError && (
                <span className="form-error">
                  {hasError}
                </span>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
          <Link href={`/dashboard?session_id=${sessionId}`} className="btn btn-secondary" style={{ padding: "0.85rem 1.5rem" }}>
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner text="Evaluating answers & detecting misconceptions..." /> : "🚀 Submit Diagnostic Answers"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading quiz..." dark />}>
      <QuizContent />
    </Suspense>
  );
}
