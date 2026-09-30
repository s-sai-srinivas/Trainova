"use client";

import { useState } from "react";
import { MessageSquare, Phone, User, CheckCircle, ChevronDown, Save } from "lucide-react";
import { updateClientTargets, resolveAlert } from "@/app/actions";

interface AlertClient {
  id: string;
  name: string;
  phone: string;
  goal: string;
  calorieTarget: number;
  stepTarget: number;
  healthScore: number;
  riskScore: number;
  recommendation: string;
  alertType: "RED" | "YELLOW" | "GREEN";
  triggers: string[];
  aiMessage: string;
  triggerKey: string;
}

interface AlertFeedProps {
  initialAlerts: AlertClient[];
}

export default function AlertFeed({ initialAlerts }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<AlertClient[]>(initialAlerts);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>(
    initialAlerts.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.aiMessage }), {})
  );
  
  // Quick Adjust targets state
  const [adjustCalories, setAdjustCalories] = useState<Record<string, number>>(
    initialAlerts.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.calorieTarget }), {})
  );
  const [adjustSteps, setAdjustSteps] = useState<Record<string, number>>(
    initialAlerts.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.stepTarget }), {})
  );
  const [showAdjust, setShowAdjust] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleTextChange = (id: string, text: string) => {
    setDraftMessages((prev) => ({ ...prev, [id]: text }));
  };

  const handleWhatsAppSend = (alert: AlertClient) => {
    const message = draftMessages[alert.id] || alert.aiMessage;
    // Format message text and trigger whatsapp deep link
    const cleanPhone = alert.phone.replace(/[^\d+]/g, "");
    const encodedText = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleInAppSend = async (alertId: string) => {
    try {
      const message = draftMessages[alertId];
      const alert = alerts.find((a) => a.id === alertId);
      const res = await resolveAlert(alertId, message, alert?.triggerKey || "");
      if (res.success) {
        setSuccessMsg("Dismissed until something new happens.");
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setExpandedId(null);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setSuccessMsg("Failed to dismiss alert. Please try again.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSaveTargets = async (alertId: string) => {
    setSavingId(alertId);
    try {
      const cal = adjustCalories[alertId];
      const steps = adjustSteps[alertId];
      const res = await updateClientTargets(alertId, cal, steps);
      if (res.success) {
        setSuccessMsg("Targets updated successfully!");
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId ? { ...a, calorieTarget: cal, stepTarget: steps } : a
          )
        );
        setShowAdjust((prev) => ({ ...prev, [alertId]: false }));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setSuccessMsg("Failed to update targets. Please try again.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setSavingId(null);
  };

  const toggleAdjustSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAdjust((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-col gap-md">
      {successMsg && (
        <div style={{
          backgroundColor: "var(--status-green)",
          color: "black",
          padding: "12px",
          borderRadius: "12px",
          fontWeight: 600,
          textAlign: "center",
          fontSize: "14px",
          marginBottom: "12px",
          animation: "fadeIn 0.2s ease-out"
        }}>
          {successMsg}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="glass-card flex-col items-center justify-center p-4 text-center" style={{ minHeight: "150px" }}>
          <CheckCircle size={32} color="var(--status-green)" style={{ marginBottom: "8px" }} />
          <span style={{ fontSize: "16px", fontWeight: 600 }}>Zero Active Alerts</span>
          <span style={{ color: "var(--accent-muted)", fontSize: "14px", marginTop: "4px" }}>All clients are fully compliant today!</span>
        </div>
      ) : (
        alerts.map((alert) => {
          const isExpanded = expandedId === alert.id;
          const statusClass = 
            alert.alertType === "RED" ? "card-alert-red" : 
            alert.alertType === "YELLOW" ? "card-alert-yellow" : "card-alert-green";

          const indicatorClass = 
            alert.alertType === "RED" ? "red" : 
            alert.alertType === "YELLOW" ? "yellow" : "green";

          return (
            <div 
              key={alert.id} 
              className={`glass-card ${statusClass} transition-all`}
              style={{ overflow: "hidden" }}
            >
              {/* Header section clickable to expand */}
              <div 
                className="flex-row items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(alert.id)}
                style={{ paddingBottom: isExpanded ? "12px" : "0" }}
              >
                <div className="flex-col gap-sm" style={{ flex: 1 }}>
                  <div className="flex-row items-center gap-sm">
                    <span className={`status-pill ${indicatorClass}`} />
                    <span className="text-heading" style={{ fontSize: "18px" }}>{alert.name}</span>
                    <span style={{ 
                      fontSize: "12px", 
                      color: alert.alertType === "RED" ? "var(--status-red)" : 
                             alert.alertType === "YELLOW" ? "var(--status-yellow)" : "var(--status-green)",
                      backgroundColor: "var(--bg-primary)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontWeight: 600
                    }}>
                      {alert.alertType}
                    </span>
                  </div>
                  <div className="flex-col" style={{ gap: "4px" }}>
                    {alert.triggers.map((trigger, index) => (
                      <span key={index} style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
                        • {trigger}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="touch-action">
                  <ChevronDown 
                    size={20} 
                    style={{ 
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", 
                      transition: "transform var(--transition-speed)" 
                    }} 
                  />
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ 
                  borderTop: "1px solid var(--border-frosted)", 
                  paddingTop: "16px",
                  animation: "fadeIn 0.2s ease-out" 
                }}>
                  <div className="flex-col gap-sm">
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-muted)" }}>
                      AI MESSAGE PROPOSAL
                    </span>
                    <textarea
                      value={draftMessages[alert.id]}
                      onChange={(e) => handleTextChange(alert.id, e.target.value)}
                      rows={4}
                      style={{
                        resize: "none",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--accent-white)",
                        padding: "12px",
                        borderRadius: "12px",
                        fontSize: "14px",
                        lineHeight: "1.4"
                      }}
                    />
                  </div>

                  <div className="flex-row gap-sm mt-md" style={{ flexWrap: "wrap" }}>
                    <button 
                      onClick={() => handleWhatsAppSend(alert)}
                      className="btn-primary flex-row items-center gap-sm"
                      style={{ flex: 1, padding: "8px 12px", fontSize: "14px", justifyContent: "center" }}
                    >
                      <Phone size={16} />
                      WhatsApp
                    </button>
                    <button 
                      onClick={() => handleInAppSend(alert.id)}
                      className="btn-secondary flex-row items-center gap-sm"
                      style={{ flex: 1, padding: "8px 12px", fontSize: "14px", justifyContent: "center" }}
                    >
                      <MessageSquare size={16} />
                      Dismiss
                    </button>
                  </div>

                  <div className="flex-row justify-between items-center mt-md" style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "12px" }}>
                    <div className="flex-row items-center gap-md">
                      <a 
                        href={`/trainer/clients/${alert.id}`} 
                        className="flex-row items-center gap-sm" 
                        style={{ color: "var(--accent-white)", textDecoration: "underline", fontSize: "14px" }}
                      >
                        <User size={16} />
                        View Profile
                      </a>
                      <a 
                        href={`/trainer/clients/${alert.id}/plan`} 
                        className="flex-row items-center gap-sm" 
                        style={{ color: "var(--accent-white)", textDecoration: "underline", fontSize: "14px" }}
                      >
                        Plan Workout
                      </a>
                    </div>
                    <button 
                      onClick={(e) => toggleAdjustSection(alert.id, e)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      {showAdjust[alert.id] ? "Hide Adjuster" : "Quick Adjust Plan"}
                    </button>
                  </div>

                  {/* Quick Adjust plan Section */}
                  {showAdjust[alert.id] && (
                    <div className="adjust-section flex-col gap-md mt-md" style={{ 
                      backgroundColor: "var(--bg-primary)", 
                      padding: "16px", 
                      borderRadius: "12px",
                      border: "1px solid var(--border-frosted)"
                    }}>
                      <span className="text-heading" style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
                        Quick Targets Override
                      </span>
                      <div className="flex-row gap-md">
                        <div className="flex-col" style={{ flex: 1, gap: "4px" }}>
                          <label style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Calories (kcal)</label>
                          <input 
                            type="number" 
                            value={adjustCalories[alert.id]} 
                            onChange={(e) => setAdjustCalories({ ...adjustCalories, [alert.id]: parseInt(e.target.value) || 0 })}
                            style={{ padding: "8px" }}
                          />
                        </div>
                        <div className="flex-col" style={{ flex: 1, gap: "4px" }}>
                          <label style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Daily Steps</label>
                          <input 
                            type="number" 
                            value={adjustSteps[alert.id]} 
                            onChange={(e) => setAdjustSteps({ ...adjustSteps, [alert.id]: parseInt(e.target.value) || 0 })}
                            style={{ padding: "8px" }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSaveTargets(alert.id)}
                        disabled={savingId === alert.id}
                        className="btn-primary flex-row items-center gap-sm justify-center"
                        style={{ padding: "8px", fontSize: "13px" }}
                      >
                        <Save size={16} />
                        {savingId === alert.id ? "Saving..." : "Save Override"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
