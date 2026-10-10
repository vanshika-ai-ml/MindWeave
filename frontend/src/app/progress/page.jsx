"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import MasteryBadge from "../../components/MasteryBadge.jsx";

export default function ProgressPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProgressHistory()
      .then((records) => {
        setHistory(records || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load progress records");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner text="Compiling your verified learning progress history..." dark />;
  }

  // Aggregate metrics
  const totalCompleted = history.length;
  const avgDelta = totalCompleted > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.score_delta || 0), 0) / totalCompleted)
    : 0;
  const totalMastered = history.reduce((acc, curr) => acc + (curr.concepts_mastered || 0), 0);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
            Performance Records
          </span>
          <h1 style={{ fontSize: "2.3rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
            Progress & Mastery Trajectory
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Verified longitudinal growth tracking across all completed learning sessions.
          </p>
        </div>

        <Link href="/" className="btn btn-primary">
          + Start New Subject
        </Link>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="card" style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>
              Sessions Completed
            </span>
            <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--text-main)", marginTop: "0.2rem" }}>
              {totalCompleted}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>
              Average Retest Delta
            </span>
            <div style={{ fontSize: "2rem", fontWeight: 850, color: avgDelta >= 0 ? "var(--mastery-green)" : "var(--mastery-red)", marginTop: "0.2rem" }}>
              {avgDelta >= 0 ? `+${avgDelta}%` : `${avgDelta}%`}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>
              Concepts Mastered
            </span>
            <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--accent-primary)", marginTop: "0.2rem" }}>
              {totalMastered}
            </div>
          </div>
        </div>
      </div>

      {/* Historical List */}
      <h2 style={{ fontSize: "1.35rem", fontWeight: 750, color: "var(--text-main)", marginBottom: "1rem" }}>
        Session History & Verified Gains
      </h2>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>📊</span>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Completed Retests Yet</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
            When you complete a diagnostic quiz, revise weak concepts, and submit a retest, your before-and-after performance records will appear here.
          </p>
          <Link href="/" className="btn btn-primary">Start Learning Now</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {history.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 750, color: "var(--text-main)" }}>
                  {item.topic}
                </h3>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {item.concepts_mastered} / {item.total_concepts} concepts mastered &bull; Completed {new Date(item.completed_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Initial</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 750, color: "var(--mastery-red)" }}>{item.initial_avg_score}%</span>
                </div>

                <div style={{ fontSize: "1.2rem", color: "var(--text-dim)" }}>&rarr;</div>

                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Retest</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 750, color: "var(--mastery-green)" }}>{item.retest_avg_score}%</span>
                </div>

                <div style={{ backgroundColor: item.score_delta >= 0 ? "var(--mastery-green-bg)" : "var(--mastery-red-bg)", border: `1px solid ${item.score_delta >= 0 ? "var(--mastery-green-border)" : "var(--mastery-red-border)"}`, padding: "0.4rem 0.85rem", borderRadius: "var(--radius-full)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: item.score_delta >= 0 ? "var(--mastery-green-text)" : "var(--mastery-red-text)" }}>
                    {item.score_delta >= 0 ? `+${item.score_delta}%` : `${item.score_delta}%`}
                  </span>
                </div>

                <Link href={`/dashboard?session_id=${item.session_id}`} className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "0.45rem 0.95rem" }}>
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
