"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api.js";
import { TopicInputSchema, DocumentUploadSchema } from "../lib/validation.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import MasteryBadge from "../components/MasteryBadge.jsx";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("topic"); // "topic" or "upload"
  const [topicInput, setTopicInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    // Load recent sessions if available
    api.listSessions()
      .then((sessions) => setRecentSessions(sessions || []))
      .catch(() => {});
  }, []);

  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Client-side validation with Zod
    const validation = TopicInputSchema.safeParse({ topic: topicInput });
    if (!validation.success) {
      setValidationError(validation.error.errors[0]?.message || "Invalid topic input");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Analyzing "${topicInput}" and mapping core concept hierarchy...`);

    try {
      const session = await api.createTopicSession(topicInput.trim());
      localStorage.setItem("mindweave_active_session_id", session.session_id);
      router.push(`/dashboard?session_id=${session.session_id}`);
    } catch (err) {
      setValidationError(err.message || "Failed to create learning session. Please try again.");
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!selectedFile) {
      setValidationError("Please select a file to upload (.pdf, .docx, or .txt)");
      return;
    }

    // Client-side validation with Zod
    const validation = DocumentUploadSchema.safeParse({
      file: selectedFile,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type
    });

    if (!validation.success) {
      setValidationError(validation.error.errors[0]?.message || "Invalid document");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Extracting content from ${selectedFile.name} and generating learning map...`);

    try {
      const session = await api.uploadMaterialSession(selectedFile);
      localStorage.setItem("mindweave_active_session_id", session.session_id);
      router.push(`/dashboard?session_id=${session.session_id}`);
    } catch (err) {
      setValidationError(err.message || "Failed to process uploaded file.");
      setIsLoading(false);
    }
  };

  const handleSelectRecentSession = (sessionId) => {
    localStorage.setItem("mindweave_active_session_id", sessionId);
    router.push(`/dashboard?session_id=${sessionId}`);
  };

  const sampleTopics = [
    "Database Management Systems",
    "Operating Systems & Concurrency",
    "Machine Learning Fundamentals",
    "Computer Networks & TCP/IP",
    "Data Structures & Algorithms"
  ];

  return (
    <div className="fade-in">
      {/* Hero Header */}
      <section className="hero">
        <div className="hero-tag">
          <span>🧠 AI-POWERED CONCEPT DIAGNOSTICS</span>
        </div>
        <h1 className="hero-title">
          Learn. Connect. <span className="hero-title-gradient">Understand.</span>
        </h1>
        <p className="hero-subtitle">
          Most learning platforms tell students what they got wrong.
          MindWeave uncovers what you actually understand &mdash; pinpointing misconceptions and building genuine mastery.
        </p>
      </section>

      {/* Main Intake Card */}
      <div className="card" style={{ maxWidth: "780px", margin: "0 auto" }}>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "topic" ? "active" : ""}`}
            onClick={() => { setActiveTab("topic"); setValidationError(""); }}
          >
            ✏️ Enter a Topic
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => { setActiveTab("upload"); setValidationError(""); }}
          >
            📄 Upload Notes or Syllabus
          </button>
        </div>

        {activeTab === "topic" ? (
          <form onSubmit={handleTopicSubmit}>
            <div className="form-group">
              <label htmlFor="topic-input" className="form-label">
                What concept or subject do you want to master?
              </label>
              <input
                id="topic-input"
                type="text"
                className="form-input"
                placeholder="e.g. Database Management Systems, Neural Networks, Docker..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              {validationError && <span className="form-error">{validationError}</span>}
            </div>

            {/* Quick Sample Topics */}
            <div style={{ marginBottom: "1.75rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                Suggested Topics:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {sampleTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTopicInput(t); setValidationError(""); }}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.95rem" }}
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner text={loadingMessage} /> : "🚀 Start Learning Path"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <label className="form-label">Upload Course PDF, DOCX, or TXT</label>
              <div
                className={`dropzone ${selectedFile ? "active" : ""}`}
                onClick={() => document.getElementById("file-upload-input").click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setValidationError("");
                    }
                  }}
                  disabled={isLoading}
                />
                <div className="dropzone-icon">📁</div>
                <div className="dropzone-text">
                  {selectedFile ? selectedFile.name : "Click to select or drag and drop a file"}
                </div>
                <div className="dropzone-subtext">
                  Supports PDF, DOCX, and TXT files up to 10MB
                </div>
              </div>
              {validationError && <span className="form-error">{validationError}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.95rem" }}
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? <LoadingSpinner text={loadingMessage} /> : "🔍 Parse Material & Generate Map"}
            </button>
          </form>
        )}
      </div>

      {/* Recent Learning Sessions */}
      {recentSessions.length > 0 && (
        <section style={{ maxWidth: "780px", margin: "3rem auto 0 auto" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 750, color: "var(--text-main)", marginBottom: "1rem" }}>
            📚 Resume Previous Sessions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentSessions.map((s) => (
              <div
                key={s.session_id}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  cursor: "pointer"
                }}
                onClick={() => handleSelectRecentSession(s.session_id)}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-main)" }}>
                    {s.topic}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {s.concept_count} concepts &bull; Created {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {s.has_evaluation ? (
                    <MasteryBadge score={s.overall_mastery} />
                  ) : (
                    <span className="badge badge-unassessed">Not Assessed Yet</span>
                  )}
                  <span style={{ fontSize: "1.2rem", color: "var(--text-dim)" }}>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
