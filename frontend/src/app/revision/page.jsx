"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";

function RevisionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");
  const singleConceptId = searchParams.get("concept_id");

  const [sessionId, setSessionId] = useState(null);
  const [revisionData, setRevisionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }
    setSessionId(activeId);

    const targetList = singleConceptId ? [singleConceptId] : null;

    api.generateRevision(activeId, targetList)
      .then((data) => {
        setRevisionData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to generate revision modules");
        setLoading(false);
      });
  }, [querySessionId, singleConceptId, router]);

  if (loading) {
    return <LoadingSpinner text="Generating targeted remediation modules & analogies for weak concepts..." dark />;
  }

  if (error || !revisionData || revisionData.modules.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>No Revision Needed</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          {error || "All assessed concepts are currently in mastery or no concepts were marked for revision."}
        </p>
        <Link href={`/dashboard?session_id=${sessionId}`} className="btn btn-primary">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
            Targeted Remediation
          </span>
          <h1 style={{ fontSize: "2.3rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
            Personalized Revision
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Rebuilding intuition from first principles to dismantle diagnosed misconceptions.
          </p>
        </div>

        <Link href={`/retest?session_id=${sessionId}`} className="btn btn-primary" style={{ padding: "0.85rem 1.6rem" }}>
          🔄 Take Targeted Retest
        </Link>
      </div>

      {/* Modules */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {revisionData.modules.map((mod, idx) => (
          <div key={mod.concept_id || idx} className="revision-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span className="badge badge-developing">Module {idx + 1}</span>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}>
                {mod.concept_label}
              </h2>
            </div>

            {/* Simplified Explanation */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                1. First-Principles Explanation
              </span>
              <p style={{ fontSize: "0.98rem", color: "var(--text-main)", lineHeight: 1.65 }}>
                {mod.simplified_explanation}
              </p>
            </div>

            {/* Analogy */}
            <div className="analogy-callout">
              <div className="analogy-title">
                💡 Real-World Intuitive Analogy
              </div>
              <p style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                {mod.analogy}
              </p>
            </div>

            {/* Practical Application */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.35rem" }}>
                2. Practical Engineering Application
              </span>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {mod.practical_application}
              </p>
            </div>

            {/* Misconception vs Correct Model */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ backgroundColor: "var(--mastery-red-bg)", border: "1px solid var(--mastery-red-border)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 750, color: "var(--mastery-red-text)", display: "block", marginBottom: "0.35rem" }}>
                  ⚠️ The Common Misconception
                </span>
                <p style={{ fontSize: "0.9rem", color: "var(--mastery-red-text)", lineHeight: 1.5 }}>
                  {mod.misconception_analysis}
                </p>
              </div>

              <div style={{ backgroundColor: "var(--mastery-green-bg)", border: "1px solid var(--mastery-green-border)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 750, color: "var(--mastery-green-text)", display: "block", marginBottom: "0.35rem" }}>
                  ✅ The Correct Mental Model
                </span>
                <p style={{ fontSize: "0.9rem", color: "var(--mastery-green-text)", lineHeight: 1.5 }}>
                  {mod.correct_mental_model}
                </p>
              </div>
            </div>

            {/* Practice Reflection Prompts */}
            {mod.practice_prompts && mod.practice_prompts.length > 0 && (
              <div style={{ backgroundColor: "var(--bg-surface-elevated)", padding: "1rem 1.25rem", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.4rem" }}>
                  🧠 Reflection & Self-Check Prompts
                </span>
                <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  {mod.practice_prompts.map((p, i) => (
                    <li key={i} style={{ marginBottom: "0.35rem" }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Retest CTA */}
      <div style={{ textAlign: "center", margin: "3rem 0 2rem 0" }}>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Ready to verify that your misconceptions are resolved?
        </p>
        <Link href={`/retest?session_id=${sessionId}`} className="btn btn-primary" style={{ padding: "0.95rem 2.5rem", fontSize: "1.1rem" }}>
          🔄 Start Targeted Retest & Measure Improvement
        </Link>
      </div>
    </div>
  );
}

export default function RevisionPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading revision..." dark />}>
      <RevisionContent />
    </Suspense>
  );
}
