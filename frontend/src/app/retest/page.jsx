"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import { QuestionnaireSubmissionSchema } from "../../lib/validation.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import MasteryBadge from "../../components/MasteryBadge.jsx";

function RetestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }
    setSessionId(activeId);

    api.generateRetest(activeId)
      .then((retestQuestions) => {
        setQuestions(retestQuestions || []);
        const initial = {};
        (retestQuestions || []).forEach(q => { initial[q.id] = ""; });
        setUserAnswers(initial);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to generate retest questions");
        setLoading(false);
      });
  }, [querySessionId, router]);

  const handleSelectOption = (questionId, optionText) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionText }));
    setValidationErrors(prev => ({ ...prev, [questionId]: null }));
  };

  const handleTextChange = (questionId, text) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: text }));
    setValidationErrors(prev => ({ ...prev, [questionId]: null }));
  };

  const handleSubmitRetest = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});
    
    const submissionBatch = questions.map(q => ({
      questionId: q.id,
      conceptId: q.concept_id || q.conceptId || "unknown" ,
      studentAnswer: (userAnswers[q.id] || "").trim()
    }));

    console.log("Users answers:",userAnswers);
    console.log("submission batch:",submissionBatch);
    
    

    // Client Zod validation
    const validation = QuestionnaireSubmissionSchema.safeParse({
      sessionId: sessionId,
      answers: submissionBatch
    });

    if (!validation.success) {
      console.log("Validation errors:",validation.error.issues);

      
      const fieldErrors = {};
      validation.error.errors.forEach(err => {
        if (err.path && err.path[1] !== undefined) {
          const index = err.path[1];
          const qId = questions[index]?.id;
          if (qId) fieldErrors[qId] = "Please answer this question";
        }
      });
      setValidationErrors(fieldErrors);
      setError("Please complete all retest questions before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await api.submitRetest(sessionId, submissionBatch.map((a) => ({
        question_id: a.questionId,
        student_answer: a.studentAnswer
      })));
      setCompareResult(result);
      setSubmitting(false);
    } catch (err) {
      setError(err.message || "Failed to evaluate retest.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating fresh retest questions targeting your revised concepts..." dark />;
  }

  // If retest has been submitted, display the Pre vs Post score improvement comparison!
  if (compareResult) {
    const isPositive = compareResult.improvement_delta >= 0;
    return (
      <div className="fade-in" style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Celebration / Comparison Banner */}
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem", marginBottom: "2rem", background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)" }}>
          <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>
            {isPositive ? "🎉" : "📈"}
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 750, color: "var(--accent-primary)", textTransform: "uppercase" }}>
            Post-Revision Verification
          </span>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--text-main)", marginTop: "0.25rem" }}>
            Conceptual Growth Verified!
          </h1>
          <p style={{ fontSize: "1.05rem", color: "var(--text-muted)", maxWidth: "600px", margin: "0.5rem auto 2rem auto" }}>
            Here is your verified before-and-after diagnostic comparison following targeted revision.
          </p>

          {/* Score Delta Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "1.5rem", maxWidth: "620px", margin: "0 auto", padding: "1.5rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Pre-Revision Score</span>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--mastery-red)" }}>
                {compareResult.pre_retest_avg}%
              </div>
            </div>

            <div style={{ fontSize: "2rem", color: "var(--text-dim)", fontWeight: 300 }}>
              &rarr;
            </div>

            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Post-Revision Score</span>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--mastery-green)" }}>
                {compareResult.post_retest_avg}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <span className="badge badge-mastery" style={{ fontSize: "1rem", padding: "0.5rem 1.25rem" }}>
              Improvement Delta: {isPositive ? `+${compareResult.improvement_delta}%` : `${compareResult.improvement_delta}%`} Conceptual Boost
            </span>
          </div>
        </div>

        {/* Retest Question Evaluations */}
        <h2 style={{ fontSize: "1.35rem", fontWeight: 750, color: "var(--text-main)", marginBottom: "1rem" }}>
          Retest Performance Details
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {compareResult.evaluations.map((item, idx) => (
            <div key={item.question_id || idx} className="card" style={{ borderLeft: item.score >= 75 ? "4px solid var(--mastery-green)" : "4px solid var(--mastery-yellow)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                    Retest Q{idx + 1} &bull; {item.concept_label}
                  </span>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem" }}>
                    {item.question_text}
                  </h3>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 850, color: item.score >= 75 ? "var(--mastery-green)" : "var(--mastery-yellow)" }}>
                  {item.score}%
                </div>
              </div>

              <div style={{ marginTop: "0.75rem", fontSize: "0.92rem", color: "var(--text-muted)" }}>
                <strong>Feedback:</strong> {item.feedback}
              </div>
            </div>
          ))}
        </div>

        {/* Next Actions */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", margin: "3rem 0 2rem 0" }}>
          <Link href={`/understanding?session_id=${sessionId}`} className="btn btn-secondary">
            Inspect Updated Understanding Map
          </Link>
          <Link href="/progress" className="btn btn-primary" style={{ padding: "0.85rem 1.75rem" }}>
            📊 View Lifetime Progress Dashboard &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: "840px", margin: "0 auto" }}>
      {/* Retest Intake Header */}
      <div style={{ marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
          Post-Revision Check
        </span>
        <h1 style={{ fontSize: "2.3rem", fontWeight: 850, color: "var(--text-main)" }}>
          Targeted Retest
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          These fresh questions focus specifically on the concepts where misconceptions were identified.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "var(--mastery-red-bg)", border: "1px solid var(--mastery-red-border)", padding: "1rem", borderRadius: "var(--radius-md)", color: "var(--mastery-red-text)", marginBottom: "1.5rem", fontWeight: 650 }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmitRetest}>
        {questions.map((q, idx) => {
          const currentAnswer = userAnswers[q.id] || "";
          const hasError = validationErrors[q.id];

          return (
            <div key={q.id} className="question-card" style={{ borderLeft: hasError ? "4px solid var(--mastery-red)" : "1px solid var(--border-subtle)" }}>
              <div className="question-meta">
                <span className="question-num">Retest Question {idx + 1} of {questions.length}</span>
                <span className="badge badge-unassessed">📌 {q.concept_label}</span>
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
                <textarea
                  className="form-textarea"
                  placeholder="Demonstrate your updated understanding..."
                  value={currentAnswer}
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                  disabled={submitting}
                />
              )}

              {hasError && <span className="form-error">{hasError}</span>}
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
          <Link href={`/revision?session_id=${sessionId}`} className="btn btn-secondary">
            Back to Revision
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner text="Evaluating retest & calculating score delta..." /> : "🔄 Submit Retest & Compare Improvement"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RetestPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading retest..." dark />}>
      <RetestContent />
    </Suspense>
  );
}
