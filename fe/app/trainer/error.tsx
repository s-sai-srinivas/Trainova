"use client";

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      textAlign: "center",
    }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Trainer Dashboard Error</h2>
      <p style={{ marginBottom: "1.5rem", opacity: 0.7 }}>
        Failed to load trainer data
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.75rem 1.5rem",
          background: "var(--accent-white)",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
