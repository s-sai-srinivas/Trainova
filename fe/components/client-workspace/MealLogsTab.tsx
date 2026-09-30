"use client";

import { useState } from "react";
import { submitTrainerMealFeedback } from "@/app/actions";
import { Utensils, MessageSquare, Clock, Check, Edit2 } from "lucide-react";

import { MealLogData } from "@/lib/types";

interface MealLogsTabProps {
  clientId: string;
  mealLogs: MealLogData[];
}

export default function MealLogsTab({ clientId, mealLogs }: MealLogsTabProps) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleEditClick = (log: MealLogData) => {
    setEditingLogId(log.id);
    setFeedbackText(log.trainerFeedback || "");
  };

  const handleSaveFeedback = async (logId: string) => {
    setSavingId(logId);
    try {
      const res = await submitTrainerMealFeedback(clientId, logId, feedbackText.trim());
      if (res.success) {
        setEditingLogId(null);
        setFeedbackText("");
      } else {
        alert("Failed to submit feedback.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert("Error: " + errorMessage);
    } finally {
      setSavingId(null);
    }
  };

  const formatLoggedTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex-col gap-md" style={{ animation: "fadeIn 0.2s ease-out" }}>
      <section className="glass-card flex-col gap-sm">
        <div className="flex-row items-center gap-xs" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px", marginBottom: "8px" }}>
          <Utensils size={18} color="var(--accent-white)" style={{ opacity: 0.8 }} />
          <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Client Meal Logs (Last 30 Days)
          </span>
        </div>

        {mealLogs.length === 0 ? (
          <div 
            className="flex-col items-center justify-center text-center p-md gap-sm"
            style={{ 
              backgroundColor: "rgba(255,255,255,0.01)", 
              borderRadius: "8px", 
              border: "1px dashed var(--border-frosted)",
              minHeight: "180px"
            }}
          >
            <Utensils size={32} color="var(--accent-muted)" style={{ opacity: 0.5 }} />
            <span style={{ fontSize: "14px", color: "var(--accent-white)", fontWeight: 600 }}>No Meals Logged Yet</span>
            <p style={{ fontSize: "12px", color: "var(--accent-muted)", margin: 0, maxWidth: "280px", lineHeight: "1.4" }}>
              When the client uploads or takes photos of their meals, they will appear here with dynamic macro breakdowns and feedback options.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            {mealLogs.map((log) => {
              const isEditing = editingLogId === log.id;
              const hasFeedback = !!log.trainerFeedback;

              return (
                <div 
                  key={log.id} 
                  className="flex-col gap-md p-md"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.01)",
                    border: "1px solid var(--border-frosted)",
                    borderRadius: "16px",
                    position: "relative",
                  }}
                >
                  <div className="flex-row gap-md flex-wrap items-start">
                    {/* Meal Image */}
                    {log.imageUrl ? (
                      <div 
                        style={{
                          width: "120px",
                          height: "120px",
                          borderRadius: "12px",
                          backgroundImage: `url(${log.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          border: "1px solid var(--border-frosted)",
                          backgroundColor: "rgba(0,0,0,0.2)",
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div 
                        className="flex-row items-center justify-center"
                        style={{
                          width: "120px",
                          height: "120px",
                          borderRadius: "12px",
                          border: "1px dashed var(--border-frosted)",
                          backgroundColor: "rgba(255,255,255,0.01)",
                          color: "var(--accent-muted)",
                          flexShrink: 0
                        }}
                      >
                        <Utensils size={24} style={{ opacity: 0.4 }} />
                      </div>
                    )}

                    {/* Meal details */}
                    <div className="flex-col gap-xs" style={{ flex: 1, minWidth: "200px" }}>
                      <div className="flex-row justify-between items-start flex-wrap gap-xs">
                        <h3 className="text-heading" style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                          {log.name}
                        </h3>
                        <div className="flex-row items-center gap-xxs" style={{ fontSize: "11px", color: "var(--accent-muted)" }}>
                          <Clock size={12} />
                          <span>{formatLoggedTime(log.loggedAt)}</span>
                        </div>
                      </div>

                      {/* Calories & Macros Row */}
                      <div className="flex-row items-center gap-xs flex-wrap mt-xxs">
                        <span style={{ fontSize: "18px", fontWeight: 900, color: "var(--accent-white)" }}>
                          {log.calories} <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--accent-muted)" }}>kcal</span>
                        </span>
                        <div style={{ display: "inline-flex", gap: "8px", fontSize: "12px", borderLeft: "1px solid var(--border-frosted)", paddingLeft: "10px" }}>
                          <span style={{ color: "#818cf8" }}>P: <strong>{log.protein}g</strong></span>
                          <span style={{ color: "#fbbf24" }}>C: <strong>{log.carbs}g</strong></span>
                          <span style={{ color: "#fb7185" }}>F: <strong>{log.fats}g</strong></span>
                        </div>
                      </div>

                      {/* Coach Feedback Box */}
                      <div className="mt-sm" style={{ borderTop: "1px dashed var(--border-frosted)", paddingTop: "12px" }}>
                        {isEditing ? (
                          <div className="flex-col gap-xs">
                            <label style={{ fontSize: "10px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                              Coach Feedback / Guidance
                            </label>
                            <textarea
                              rows={2}
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="Great high-protein choice! Watch out for the sodium content..."
                              style={{
                                width: "100%",
                                backgroundColor: "var(--bg-primary)",
                                border: "1px solid var(--border-frosted)",
                                color: "var(--accent-white)",
                                padding: "8px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                resize: "none",
                                outline: "none"
                              }}
                            />
                            <div className="flex-row gap-xs justify-end mt-xxs">
                              <button
                                onClick={() => setEditingLogId(null)}
                                className="btn-secondary"
                                style={{ padding: "4px 12px", fontSize: "12px", height: "28px" }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveFeedback(log.id)}
                                disabled={savingId === log.id}
                                className="btn-primary flex-row items-center gap-xxs"
                                style={{ padding: "4px 12px", fontSize: "12px", height: "28px", color: "var(--bg-primary)" }}
                              >
                                <Check size={12} />
                                {savingId === log.id ? "Saving..." : "Save Feedback"}
                              </button>
                            </div>
                          </div>
                        ) : hasFeedback ? (
                          <div className="flex-col gap-xxs" style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div className="flex-row justify-between items-center">
                              <span style={{ fontSize: "11px", color: "var(--status-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                <MessageSquare size={12} />
                                COACH FEEDBACK
                              </span>
                              <button 
                                onClick={() => handleEditClick(log)}
                                className="flex-row items-center gap-xxs touch-action"
                                style={{ background: "none", border: "none", color: "var(--accent-muted)", cursor: "pointer", fontSize: "11px" }}
                              >
                                <Edit2 size={10} /> Edit
                              </button>
                            </div>
                            <p style={{ fontSize: "12.5px", color: "var(--accent-white)", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                              {log.trainerFeedback}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(log)}
                            className="btn-secondary flex-row items-center justify-center gap-xs w-full"
                            style={{ height: "32px", fontSize: "12px" }}
                          >
                            <MessageSquare size={13} />
                            Add Guidance / Feedback
                          </button>
                        )}
                      </div>

                      {log.feedbackAt && (
                        <div style={{ fontSize: "11px", color: "var(--status-green)", marginTop: "4px" }}>
                          Coach feedback on {new Date(log.feedbackAt).toLocaleDateString()}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
