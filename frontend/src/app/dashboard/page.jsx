"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import MasteryBadge from "../../components/MasteryBadge.jsx";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedConceptId, setExpandedConceptId] = useState(null);

  useEffect(() => {
    const activeId = querySessionId || localStorage.getItem("mindweave_active_session_id");
    if (!activeId) {
      router.push("/");
      return;
    }

    localStorage.setItem("mindweave_active_session_id", activeId);
    api.getSession(activeId)
      .then((data) => {
        setSession(data);
        if (data.concepts && data.concepts.length > 0) {
          setExpandedConceptId(data.concepts[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load session");
        setLoading(false);
      });
  }, [querySessionId, router]);

  if (loading) {
    return <LoadingSpinner text="Loading your structured learning path..." dark />;
  }

  if (error || !session) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2 style={{ color: "var(--mastery-red)", marginBottom: "1rem" }}>Error Loading Session</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
        <Link href="/" className="btn btn-primary">Start New Session</Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Session Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Active Learning Path
          </span>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
            {session.topic}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            {session.concepts.length} key concepts mapped &bull; Source: {session.source_type === "upload" ? "Document Upload" : "Topic Input"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/graph?session_id=${session.session_id}`} className="btn btn-secondary">
            🕸️ Concept Graph
          </Link>
          <Link href={`/quiz?session_id=${session.session_id}`} className="btn btn-primary">
            ✍️ Start Diagnostic Quiz
          </Link>
        </div>
      </div>

      {/* Topic Overview Card */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>📖</span> Topic Overview
        </h2>
        <p className="card-desc" style={{ whiteSpace: "pre-line", fontSize: "1.02rem" }}>
          {session.overview}
        </p>
      </div>

      {/* Concepts Section */}
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 750, color: "var(--text-main)" }}>
          🧩 Mapped Concepts ({session.concepts.length})
        </h2>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Click a concept card to inspect detailed explanations
        </span>
      </div>

      <div className="concept-grid">
        {session.concepts.map((concept) => {
          const isExpanded = expandedConceptId === concept.id;
          return (
            <div
              key={concept.id}
              className={`concept-card ${isExpanded ? "selected" : ""}`}
              onClick={() => setExpandedConceptId(isExpanded ? null : concept.id)}
            >
              <div>
                <div className="concept-card-header">
                  <h3 className="concept-label">{concept.label}</h3>
                  <MasteryBadge tier={concept.status_tier} score={concept.mastery_score} />
                </div>
                <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "0.85rem" }}>
                  {concept.description}
                </p>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem", marginTop: "0.85rem" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.3rem" }}>
                      Deep Explanation
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: "0.85rem" }}>
                      {concept.explanation}
                    </p>

                    {concept.examples && concept.examples.length > 0 && (
                      <div style={{ marginBottom: "0.85rem" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.3rem" }}>
                          Examples
                        </div>
                        <ul style={{ paddingLeft: "1.2rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                          {concept.examples.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {concept.prerequisites && concept.prerequisites.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 750, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.3rem" }}>
                          Prerequisites
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          {concept.prerequisites.map((p, idx) => (
                            <span key={idx} className="badge badge-unassessed" style={{ fontSize: "0.75rem" }}>
                              🔗 {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "1rem", textAlign: "right", fontSize: "0.82rem", color: "var(--accent-primary)", fontWeight: 600 }}>
                {isExpanded ? "▲ Collapse" : "▼ Expand Explanation"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading dashboard..." dark />}>
      <DashboardContent />
    </Suspense>
  );
}
