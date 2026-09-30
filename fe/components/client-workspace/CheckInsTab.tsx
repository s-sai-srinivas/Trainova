"use client";

interface CheckIn {
  date: string;
  weight: number | null;
  sleepHours: number | null;
  energyScore: number | null;
  dietAdherence: boolean;
}

interface CheckInsTabProps {
  checkIns: CheckIn[];
}

export default function CheckInsTab({ checkIns }: CheckInsTabProps) {
  return (
    <div className="glass-card flex-col gap-md">
      <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700 }}>Daily Check-in Logs history</span>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "400px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-frosted)", color: "var(--accent-muted)", textAlign: "left" }}>
              <th style={{ padding: "8px" }}>Date</th>
              <th style={{ padding: "8px" }}>Weight</th>
              <th style={{ padding: "8px" }}>Sleep</th>
              <th style={{ padding: "8px" }}>Energy</th>
              <th style={{ padding: "8px" }}>Diet Target</th>
            </tr>
          </thead>
          <tbody>
            {checkIns.map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "8px" }}>{new Date(c.date).toLocaleDateString()}</td>
                <td style={{ padding: "8px" }}>{c.weight ? `${c.weight}kg` : "N/A"}</td>
                <td style={{ padding: "8px" }} className={c.sleepHours && c.sleepHours < 7 ? "text-yellow" : ""}>
                  {c.sleepHours ? `${c.sleepHours}h` : "N/A"}
                </td>
                <td style={{ padding: "8px" }}>{c.energyScore ? `${c.energyScore}/10` : "N/A"}</td>
                <td style={{ padding: "8px", color: c.dietAdherence ? "var(--status-green)" : "var(--status-yellow)" }}>
                  {c.dietAdherence ? "Met" : "Missed"}
                </td>
              </tr>
            ))}
            {checkIns.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "var(--accent-muted)" }}>
                  No check-ins logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
