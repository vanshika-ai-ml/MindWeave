"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import MasteryBadge from "../../components/MasteryBadge.jsx";

function UnderstandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [sessionId, setSessionId] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }
    setSessionId(activeId);

    api.getUnderstandingMap(activeId)
      .then((data) => {
        setStatuses(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load understanding map");
        setLoading(false);
      });
  }, [querySessionId, router]);

  if (loading) {
    return <LoadingSpinner text="Computing concept understanding map..." dark />;
  }

  const weakConcepts = statuses.filter(s => s.needs_revision);
  const masteredConcepts = statuses.filter(s => s.status_tier === "mastery");
  const unassessedConcepts = statuses.filter(s => s.status_tier === "unassessed");

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
            Cognitive Diagnostics
          </span>
          <h1 style={{ fontSize: "2.3rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
            Understanding Map
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Visual mapping of real assessed knowledge versus cognitive misconceptions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href={`/graph?session_id=${sessionId}`} className="btn btn-secondary">
            🕸️ View Graph
          </Link>
          {weakConcepts.length > 0 && (
            <Link href={`/revision?session_id=${sessionId}`} className="btn btn-primary">
              💡 Revise {weakConcepts.length} Weak Concept{weakConcepts.length > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      </div>

      {/* Mastery Stats Bar */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem" }}>
          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>Total Concepts</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 850, color: "var(--text-main)" }}>{statuses.length}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--mastery-green-text)", fontWeight: 700, textTransform: "uppercase" }}>Mastered (Strong)</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 850, color: "var(--mastery-green)" }}>{masteredConcepts.length}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--mastery-red-text)", fontWeight: 700, textTransform: "uppercase" }}>Needs Revision</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 850, color: "var(--mastery-red)" }}>{weakConcepts.length}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>Unassessed</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 850, color: "var(--text-muted)" }}>{unassessedConcepts.length}</div>
          </div>
        </div>
      </div>

      {/* Concept Grid with Mastery & Misconception Breakdown */}
      <div className="concept-grid">
        {statuses.map((concept) => (
          <div
            key={concept.concept_id}
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderTop: concept.status_tier === "mastery" ? "4px solid var(--mastery-green)" : concept.status_tier === "developing" ? "4px solid var(--mastery-yellow)" : concept.status_tier === "novice" ? "4px solid var(--mastery-red)" : "4px solid var(--mastery-neutral)"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 750, color: "var(--text-main)" }}>
                  {concept.label}
                </h3>
                <MasteryBadge tier={concept.status_tier} score={concept.status_tier === "unassessed" ? null : concept.score} />
              </div>

              {/* Progress Bar */}
              {concept.status_tier !== "unassessed" && (
                <div style={{ width: "100%", height: "6px", backgroundColor: "var(--bg-surface-elevated)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: `${concept.score}%`,
                      height: "100%",
                      backgroundColor: concept.score >= 75 ? "var(--mastery-green)" : concept.score >= 50 ? "var(--mastery-yellow)" : "var(--mastery-red)",
                      borderRadius: "var(--radius-full)",
                      transition: "width 0.5s ease"
                    }}
                  />
                </div>
              )}

              {/* Misconceptions detected on this concept */}
              {concept.misconceptions && concept.misconceptions.length > 0 && (
                <div style={{ backgroundColor: "var(--mastery-red-bg)", border: "1px solid var(--mastery-red-border)", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 750, color: "var(--mastery-red-text)", display: "block", marginBottom: "0.25rem" }}>
                    ⚠️ Detected Cognitive Flaw:
                  </span>
                  <ul style={{ paddingLeft: "1rem", fontSize: "0.85rem", color: "var(--mastery-red-text)" }}>
                    {concept.misconceptions.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              {concept.needs_revision ? (
                <Link
                  href={`/revision?session_id=${sessionId}&concept_id=${concept.concept_id}`}
                  className="btn btn-outline"
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
                >
                  💡 Target in Revision
                </Link>
              ) : (
                <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600 }}>
                  {concept.status_tier === "mastery" ? "✓ Concept Solid" : "Not yet tested"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UnderstandingPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading understanding map..." dark />}>
      <UnderstandingContent />
    </Suspense>
  );
}
