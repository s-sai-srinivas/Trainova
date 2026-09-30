export default function Loading() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
    }}>
      <div style={{
        width: "32px",
        height: "32px",
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "var(--accent-white)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}
