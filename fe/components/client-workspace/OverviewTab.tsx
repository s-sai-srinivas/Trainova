"use client";

import { useRouter } from "next/navigation";
import { 
  Dumbbell, 
  FileText, 
  CheckCircle2, 
  TrendingDown, 
  Camera, 
  Moon, 
  Footprints, 
  ShieldCheck, 
  Battery, 
  ChevronRight, 
  Copy, 
  RefreshCw, 
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { duplicatePlan } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";
import { CheckIn } from "@/lib/types";

interface TimelineEvent {
  date: string;
  type: "weight" | "workout" | "photo" | "checkin";
  title: string;
  subtitle: string;
  rawDate: Date;
}

interface OverviewTabProps {
  client: {
    id: string;
    name: string;
    goal: string;
    calorieTarget: number;
    stepTarget: number;
    aiSummary: string;
    createdAt: string;
    currentPlanName?: string | null;
    currentPlanId?: string | null;
    completedSessionsCount: number;
    age?: number | null;
    injuries?: string | null;
    experienceLevel?: string | null;
    gymAccess?: string | null;
    weightTarget?: number | null;
  };
  checkIns: CheckIn[];
  timelineEvents: TimelineEvent[];
  formatEventDate: (dateStr: string) => string;
  setActiveTab: (tab: "overview" | "meals" | "progress" | "checkins" | "history") => void;
  setShowTemplateModal: (show: boolean) => void;
}

export default function OverviewTab({
  client,
  checkIns,
  timelineEvents,
  formatEventDate,
  setActiveTab,
  setShowTemplateModal
}: OverviewTabProps) {
  const router = useRouter();

  // Highlight stats calculations
  const recentSleep = checkIns[0]?.sleepHours ?? null;
  const recentSteps = checkIns[0]?.stepsLogged ?? null;
  const recentDiet = checkIns[0]?.dietAdherence ?? null;
  const recentEnergy = checkIns[0]?.energyScore ?? null;

  const getEventIcon = (type: "weight" | "workout" | "photo" | "checkin") => {
    switch (type) {
      case "workout":
        return <Dumbbell size={10} color="var(--status-green)" />;
      case "weight":
        return <TrendingDown size={10} color="#60a5fa" />;
      case "photo":
        return <Camera size={10} color="var(--accent-white)" />;
      case "checkin":
        return <FileText size={10} color="var(--status-yellow)" />;
      default:
        return <CheckCircle2 size={10} color="var(--accent-muted)" />;
    }
  };

  const getEventIconBg = (type: "weight" | "workout" | "photo" | "checkin") => {
    switch (type) {
      case "workout":
        return "rgba(16, 185, 129, 0.15)";
      case "weight":
        return "rgba(96, 165, 250, 0.15)";
      case "photo":
        return "rgba(255, 255, 255, 0.1)";
      case "checkin":
        return "rgba(245, 158, 11, 0.15)";
      default:
        return "rgba(255, 255, 255, 0.05)";
    }
  };

  return (
    <div className="flex-col gap-md" style={{ animation: "fadeIn 0.2s ease-out" }}>
      
      {/* 2-Column Responsive Layout */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
          gap: "20px",
          alignItems: "start"
        }}
      >
        {/* LEFT COLUMN: ACTIVE PLAN & VITALS */}
        <div className="flex-col gap-md">
          
          {/* Active Training Plan Card */}
          <div className="glass-card flex-col gap-md" style={{ position: "relative", overflow: "hidden" }}>
            {/* Background highlight */}
            <div 
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />

            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <div className="flex-row items-center gap-xs">
                <Dumbbell size={16} color="var(--accent-white)" style={{ opacity: 0.8 }} />
                <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Active Program
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>
                Started {new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="flex-row justify-between items-center gap-sm">
              <div className="flex-col">
                <strong style={{ fontSize: "17px", color: "var(--accent-white)", fontWeight: 700 }}>
                  {client.currentPlanName || "No Plan Assigned"}
                </strong>
                <span style={{ fontSize: "12px", color: "var(--accent-muted)", marginTop: "4px" }}>
                  {client.completedSessionsCount} workout sessions completed
                </span>
              </div>
              
              <Link
                href={`/trainer/clients/${client.id}/plan`}
                className="btn-primary flex-row items-center gap-xxs"
                style={{ padding: "6px 14px", fontSize: "12px", height: 44, color: "var(--bg-primary)", fontWeight: 700, textDecoration: "none" }}
              >
                Assign workout
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Quick Actions Row */}
            <div className="flex-row gap-sm" style={{ borderTop: "1px dashed var(--border-frosted)", paddingTop: "12px", marginTop: "4px" }}>
              <button 
                onClick={() => setShowTemplateModal(true)} 
                className="btn-secondary" 
                style={{ 
                  flex: 1, 
                  fontSize: "11px", 
                  height: "32px", 
                  padding: "0 8px",
                  display: "inline-flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "6px",
                  whiteSpace: "nowrap"
                }}
              >
                <RefreshCw size={12} />
                <span>Assign New Plan</span>
              </button>
              <button 
                onClick={async () => {
                  if (!client.currentPlanId) {
                    alert("No active plan assigned to duplicate.");
                    return;
                  }
                  const res = await duplicatePlan(client.currentPlanId);
                  if (res.success) {
                    alert("Plan cloned to a new master template successfully.");
                    router.refresh();
                  } else {
                    alert(res.error || "Failed to duplicate plan.");
                  }
                }} 
                className="btn-secondary" 
                style={{ 
                  flex: 1, 
                  fontSize: "11px", 
                  height: "32px", 
                  padding: "0 8px",
                  display: "inline-flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "6px",
                  whiteSpace: "nowrap"
                }}
              >
                <Copy size={12} />
                <span>Duplicate Plan</span>
              </button>
            </div>
          </div>

          {/* Vitals Highlights Card */}
          <div className="glass-card flex-col gap-md">
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <div className="flex-row items-center gap-xs">
                <HeartActivityIcon />
                <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Recent Check-in Vitals
                </span>
              </div>
              {checkIns.length > 0 && (
                <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>
                  Last: {formatEventDate(checkIns[0].date)}
                </span>
              )}
            </div>

            {checkIns.length > 0 ? (
              <div className="flex-col gap-sm">
                {/* Sleep Vitals Row */}
                <div className="flex-row justify-between items-center p-sm" style={{ backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-frosted)" }}>
                  <div className="flex-row items-center gap-sm">
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Moon size={16} color="var(--accent-muted)" />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontSize: "11px", color: "var(--accent-white)", fontWeight: 600 }}>Sleep Hours</span>
                      <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>{`Target: ${APP_CONFIG.SLEEP_TARGET_HOURS}-${APP_CONFIG.SLEEP_TARGET_HOURS + 1} hrs`}</span>
                    </div>
                  </div>
                  <div className="flex-col items-end">
                    <strong style={{ fontSize: "14px", color: recentSleep !== null && recentSleep < APP_CONFIG.SLEEP_TARGET_HOURS ? "var(--status-yellow)" : "var(--accent-white)" }}>
                      {recentSleep !== null ? `${recentSleep} hrs` : "Not logged"}
                    </strong>
                    {recentSleep !== null && (
                      <span style={{ fontSize: "9px", color: recentSleep < APP_CONFIG.SLEEP_TARGET_HOURS ? "var(--status-yellow)" : "var(--status-green)", fontWeight: 600 }}>
                        {recentSleep < APP_CONFIG.SLEEP_TARGET_HOURS ? "Below target" : "Optimal"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Steps Vitals Row */}
                <div className="flex-row justify-between items-center p-sm" style={{ backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-frosted)" }}>
                  <div className="flex-row items-center gap-sm">
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Footprints size={16} color="var(--accent-muted)" />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontSize: "11px", color: "var(--accent-white)", fontWeight: 600 }}>Daily Steps</span>
                      <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>Target: {client.stepTarget}</span>
                    </div>
                  </div>
                  <div className="flex-col items-end">
                    <strong style={{ fontSize: "14px", color: "var(--accent-white)" }}>
                      {recentSteps !== null ? recentSteps.toLocaleString() : "Not logged"}
                    </strong>
                    {recentSteps !== null && (
                      <span style={{ fontSize: "9px", color: recentSteps >= client.stepTarget ? "var(--status-green)" : "var(--accent-muted)", fontWeight: 600 }}>
                        {recentSteps >= client.stepTarget ? "Target met" : "In progress"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Diet Adherence Row */}
                <div className="flex-row justify-between items-center p-sm" style={{ backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-frosted)" }}>
                  <div className="flex-row items-center gap-sm">
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ShieldCheck size={16} color="var(--accent-muted)" />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontSize: "11px", color: "var(--accent-white)", fontWeight: 600 }}>Diet Adherence</span>
                      <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>{`Goal: ${APP_CONFIG.DIET_GOAL_PERCENTAGE}%+`}</span>
                    </div>
                  </div>
                  <div className="flex-col items-end">
                    <strong style={{ fontSize: "14px", color: recentDiet === true ? "var(--status-green)" : recentDiet === false ? "var(--status-yellow)" : "var(--accent-white)" }}>
                      {recentDiet === true ? "Met" : recentDiet === false ? "Missed" : "Not logged"}
                    </strong>
                    {recentDiet !== null && (
                      <span style={{ fontSize: "9px", color: recentDiet === true ? "var(--status-green)" : "var(--status-yellow)", fontWeight: 600 }}>
                        {recentDiet === true ? "On Track" : "Below limit"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Energy Row */}
                <div className="flex-row justify-between items-center p-sm" style={{ backgroundColor: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-frosted)" }}>
                  <div className="flex-row items-center gap-sm">
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Battery size={16} color="var(--accent-muted)" />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontSize: "11px", color: "var(--accent-white)", fontWeight: 600 }}>Energy Level</span>
                      <span style={{ fontSize: "10px", color: "var(--accent-muted)" }}>Scale: 1-10</span>
                    </div>
                  </div>
                  <div className="flex-col items-end">
                    <strong style={{ fontSize: "14px", color: "var(--accent-white)" }}>
                      {recentEnergy !== null ? `${recentEnergy} / 10` : "Not logged"}
                    </strong>
                    {recentEnergy !== null && (
                      <span style={{ fontSize: "9px", color: "var(--accent-muted)", fontWeight: 600 }}>
                        {recentEnergy >= APP_CONFIG.ENERGY_HIGH_THRESHOLD ? "High Energy" : "Needs Rest"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="flex-col items-center justify-center text-center p-md gap-sm"
                style={{ 
                  backgroundColor: "rgba(255,255,255,0.01)", 
                  borderRadius: "8px", 
                  border: "1px dashed var(--border-frosted)",
                  minHeight: "140px"
                }}
              >
                <FileText size={28} color="var(--accent-muted)" style={{ opacity: 0.5 }} />
                <span style={{ fontSize: "13px", color: "var(--accent-white)", fontWeight: 600 }}>No Check-in Logs Yet</span>
                <p style={{ fontSize: "11px", color: "var(--accent-muted)", margin: 0, maxWidth: "260px", lineHeight: "1.4" }}>
                  Recent sleep, daily steps, diet adherence, and energy stats will be displayed here once the client completes a check-in.
                </p>
              </div>
            )}
          </div>

          {/* Client Profile Info Card */}
          <div className="glass-card flex-col gap-md">
            <div className="flex-row items-center gap-xs" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Client Profile
              </span>
            </div>
            <div className="flex-col gap-sm">
              {client.age && (
                <div className="flex-row justify-between items-center">
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Age</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-white)" }}>{client.age} years</span>
                </div>
              )}
              {client.experienceLevel && (
                <div className="flex-row justify-between items-center">
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Experience</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-white)" }}>{client.experienceLevel}</span>
                </div>
              )}
              {client.gymAccess && (
                <div className="flex-row justify-between items-center">
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Gym Access</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-white)" }}>{client.gymAccess}</span>
                </div>
              )}
              {client.injuries && (
                <div className="flex-col gap-xxs">
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Injuries / Limitations</span>
                  <span style={{ fontSize: "12px", color: "var(--accent-white)", lineHeight: "1.4" }}>{client.injuries}</span>
                </div>
              )}
              {client.weightTarget && (
                <div className="flex-row justify-between items-center">
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Target Weight</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-white)" }}>{client.weightTarget} kg</span>
                </div>
              )}
              {!client.age && !client.experienceLevel && !client.gymAccess && !client.injuries && !client.weightTarget && (
                <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontStyle: "italic" }}>No profile data recorded yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE FEED */}
        <div className="glass-card flex-col gap-md" style={{ maxHeight: "450px", overflowY: "auto" }}>
          <div className="flex-row items-center gap-xs">
            <Sparkles size={14} color="var(--accent-white)" style={{ opacity: 0.8 }} />
            <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Activity Progress Timeline
            </span>
          </div>

          <div 
            className="flex-col gap-md" 
            style={{ 
              position: "relative", 
              paddingLeft: "24px", 
              borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
              marginLeft: "10px",
              marginTop: "8px"
            }}
          >
            {timelineEvents.map((ev, idx) => (
              <div key={idx} style={{ position: "relative" }} className="flex-col gap-xxs">
                {/* Node icon circle */}
                <div 
                  style={{
                    position: "absolute",
                    left: "-33px",
                    top: "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-frosted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    background: getEventIconBg(ev.type)
                  }}
                >
                  {getEventIcon(ev.type)}
                </div>

                <div className="flex-col gap-xxs" style={{ animation: "fadeIn 0.2s ease-out" }}>
                  <span style={{ fontSize: "9px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    {formatEventDate(ev.date)}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-white)" }}>
                    {ev.title}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)", lineHeight: "1.3" }}>
                    {ev.subtitle}
                  </span>
                </div>
              </div>
            ))}

            {timelineEvents.length === 0 && (
              <span style={{ color: "var(--accent-muted)", fontSize: "13px", padding: "12px 0" }}>
                No activity logs recorded yet.
              </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// Simple internal icon component for Vitals Header
function HeartActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
