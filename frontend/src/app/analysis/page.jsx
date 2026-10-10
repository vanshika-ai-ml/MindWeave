"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import MasteryBadge from "../../components/MasteryBadge.jsx";

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [sessionId, setSessionId] = useState(null);
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }
    setSessionId(activeId);

    // Retrieve cached evaluation or prompt to take quiz
    const cached = sessionStorage.getItem(`mindweave_eval_${activeId}`);
    if (cached) {
      try {
        setEvalData(JSON.parse(cached));
      } catch (e) {}
    }
    setLoading(false);
  }, [querySessionId, router]);

  if (loading) {
    return <LoadingSpinner text="Loading evaluation analysis..." dark />;
  }

  if (!evalData) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>No Recent Assessment Found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          You have not submitted a diagnostic quiz for this session yet.
        </p>
        <Link href={`/quiz?session_id=${sessionId}`} className="btn btn-primary">Take Diagnostic Quiz</Link>
      </div>
    );
  }

  const misconceptionsCount = evalData.evaluations.filter(e => e.misconception).length;

  return (
    <div className="fade-in" style={{ maxWidth: "880px", margin: "0 auto" }}>
      {/* Header & Overall Score Banner */}
      <div className="card" style={{ marginBottom: "2rem", background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
              Assessment Evaluation Report
            </span>
            <h1 style={{ fontSize: "2.3rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
              Diagnostic Results
            </h1>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
              Semantic analysis of conceptual depth and cognitive models.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "2.8rem", fontWeight: 900, color: evalData.overall_score >= 75 ? "var(--mastery-green)" : evalData.overall_score >= 50 ? "var(--mastery-yellow)" : "var(--mastery-red)" }}>
              {evalData.overall_score}%
            </div>
            <MasteryBadge score={evalData.overall_score} />
          </div>
        </div>

        {/* Misconception Summary Callout */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Questions Evaluated
            </span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>
              {evalData.evaluations.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Misconceptions Detected
            </span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: misconceptionsCount > 0 ? "var(--mastery-red)" : "var(--mastery-green)" }}>
              {misconceptionsCount} {misconceptionsCount > 0 ? "⚠️" : "✅"}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Concepts Needing Revision
            </span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: evalData.weak_concept_ids?.length > 0 ? "var(--mastery-yellow)" : "var(--mastery-green)" }}>
              {evalData.weak_concept_ids?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Quick Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 750, color: "var(--text-main)" }}>
          Detailed Question Breakdown
        </h2>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href={`/understanding?session_id=${sessionId}`} className="btn btn-secondary">
            🎯 View Understanding Map
          </Link>
          <Link href={`/revision?session_id=${sessionId}`} className="btn btn-primary">
            💡 Revise Weak Concepts
          </Link>
        </div>
      </div>

      {/* Evaluated Questions List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {evalData.evaluations.map((item, idx) => (
          <div key={item.question_id || idx} className="card" style={{ borderLeft: item.misconception ? "4px solid var(--mastery-red)" : item.score >= 75 ? "4px solid var(--mastery-green)" : "4px solid var(--mastery-yellow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.82rem", fontWeight: 750, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                  Question {idx + 1} &bull; {item.concept_label}
                </span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.2rem" }}>
                  {item.question_text}
                </h3>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: item.score >= 75 ? "var(--mastery-green)" : item.score >= 50 ? "var(--mastery-yellow)" : "var(--mastery-red)" }}>
                  {item.score}%
                </span>
                <div style={{ fontSize: "0.78rem", textTransform: "capitalize", fontWeight: 650, color: "var(--text-dim)" }}>
                  {item.correctness.replace("_", " ")}
                </div>
              </div>
            </div>

            {/* Student's Answer */}
            <div style={{ backgroundColor: "var(--bg-surface-elevated)", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.25rem" }}>
                Your Answer
              </span>
              <p style={{ fontSize: "0.92rem", color: "var(--text-main)", fontStyle: "italic" }}>
                "{item.student_answer}"
              </p>
            </div>

            {/* Semantic Feedback */}
            <div style={{ marginBottom: "0.85rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.25rem" }}>
                Pedagogical Feedback
              </span>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                {item.feedback}
              </p>
            </div>

            {/* MISCONCEPTION DETECTION CALLOUT */}
            {item.misconception && (
              <div className="misconception-box">
                <div className="misconception-title">
                  <span>⚠️</span>
                  <span>Diagnosed Cognitive Misconception</span>
                </div>
                <p className="misconception-text">
                  {item.misconception}
                </p>

                {item.suggested_correction && (
                  <div className="mental-model-box">
                    <span style={{ fontWeight: 750, color: "var(--mastery-green)", fontSize: "0.85rem", display: "block", marginBottom: "0.2rem" }}>
                      💡 Correct Mental Model
                    </span>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                      {item.suggested_correction}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "3rem" }}>
        <Link href={`/understanding?session_id=${sessionId}`} className="btn btn-secondary" style={{ padding: "0.85rem 1.75rem" }}>
          Inspect Full Understanding Map &rarr;
        </Link>
        <Link href={`/revision?session_id=${sessionId}`} className="btn btn-primary" style={{ padding: "0.85rem 2rem" }}>
          🚀 Launch Targeted Revision
        </Link>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading analysis..." dark />}>
      <AnalysisContent />
    </Suspense>
  );
}
