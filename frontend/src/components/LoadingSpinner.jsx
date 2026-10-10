export default function LoadingSpinner({ text = "Loading...", dark = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem", gap: "0.85rem" }}>
      <div className={`spinner ${dark ? "spinner-dark" : ""}`} aria-hidden="true" style={{ width: "32px", height: "32px" }}></div>
      <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>{text}</p>
    </div>
  );
}
