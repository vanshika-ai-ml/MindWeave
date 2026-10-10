"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api.js";
import ConceptGraph from "../../components/ConceptGraph.jsx";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";

function GraphContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load concept graph");
        setLoading(false);
      });
  }, [querySessionId, router]);

  if (loading) {
    return <LoadingSpinner text="Rendering interactive concept graph..." dark />;
  }

  if (error || !session) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2 style={{ color: "var(--mastery-red)", marginBottom: "1rem" }}>Graph Unavailable</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
        <Link href="/" className="btn btn-primary">Start New Session</Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
            Visual Knowledge Graph
          </span>
          <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--text-main)" }}>
            {session.topic}
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Directed prerequisite flow &bull; Click any node to inspect definitions without losing progress
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href={`/dashboard?session_id=${session.session_id}`} className="btn btn-secondary">
            📖 Dashboard View
          </Link>
          <Link href={`/quiz?session_id=${session.session_id}`} className="btn btn-primary">
            ✍️ Test Understanding
          </Link>
        </div>
      </div>

      <ConceptGraph
        concepts={session.concepts}
        relationships={session.relationships}
      />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading graph..." dark />}>
      <GraphContent />
    </Suspense>
  );
}
