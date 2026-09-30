"use client";

interface WorkoutLogData {
  date: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  targetWeight: number;
  targetReps: number;
  workoutDayName?: string;
}

interface WorkoutHistoryTabProps {
  workoutLogs: WorkoutLogData[];
}

export default function WorkoutHistoryTab({ workoutLogs }: WorkoutHistoryTabProps) {
  return (
    <div className="glass-card flex-col gap-md">
      <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700 }}>Workout Completed Sessions Logs</span>
      <div className="flex-col gap-sm">
        {workoutLogs.length === 0 ? (
          <span style={{ color: "var(--accent-muted)", padding: "16px 0", textAlign: "center" }}>No workout logs completed.</span>
        ) : (
          workoutLogs.map((log, i) => (
            <div key={i} style={{ padding: "12px", border: "1px solid var(--border-frosted)", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.01)" }}>
              <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "6px", marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px" }}>{log.workoutDayName || "Workout Day"}</strong>
                <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>{new Date(log.date).toLocaleDateString()}</span>
              </div>
              <div className="flex-row justify-between" style={{ fontSize: "12px" }}>
                <span>{log.exerciseName} (Set {log.setNumber})</span>
                <span style={{ color: "var(--status-green)" }}>{log.weight}kg x {log.reps} reps</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--accent-muted)", marginTop: "2px" }}>
                Target: {log.targetWeight}kg x {log.targetReps} reps
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
