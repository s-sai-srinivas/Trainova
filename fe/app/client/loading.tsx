export default function Loading() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: "12px",
    }}>
      <div style={{
        width: "32px",
        height: "32px",
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "var(--accent-white)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
        Loading client data...
      </p>
    </div>
  );
}
