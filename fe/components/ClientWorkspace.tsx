"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Edit2, MessageSquare, ClipboardList, TrendingUp, Dumbbell } from "lucide-react";
import Link from "next/link";
import { 
  assignPlanToClient, 
  uploadExerciseVideo,
  updateClientTargets
} from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";

import OverviewTab from "./client-workspace/OverviewTab";
import ProgressTab from "./client-workspace/ProgressTab";
import CheckInsTab from "./client-workspace/CheckInsTab";
import WorkoutHistoryTab from "./client-workspace/WorkoutHistoryTab";
import MealLogsTab from "./client-workspace/MealLogsTab";
import Modals from "./client-workspace/Modals";


import { 
  CheckIn, 
  WorkoutLogData, 
  PhotoSet, 
  ClientProfileData, 
  PlanDay, 
  ExerciseLibraryItem, 
  MealLogData 
} from "@/lib/types";

interface ClientWorkspaceProps {
  client: ClientProfileData;
  checkIns: CheckIn[];
  workoutLogs: WorkoutLogData[];
  photos: PhotoSet[];
  clientPlanDays: PlanDay[];
  exerciseLibrary: ExerciseLibraryItem[];
  masterPlanTemplates: { id: string; name: string }[];
  mealLogs?: MealLogData[];
  initialTab?: string;
}

export default function ClientWorkspace({
  client,
  checkIns,
  workoutLogs,
  photos,
  clientPlanDays,
  exerciseLibrary,
  masterPlanTemplates,
  mealLogs = [],
  initialTab,
}: ClientWorkspaceProps) {
  const router = useRouter();
  // Navigation tabs
  const validTabs = ["overview", "meals", "progress", "checkins", "history"] as const;
  type TabType = typeof validTabs[number];
  const defaultTab = (initialTab && validTabs.includes(initialTab as TabType) ? initialTab : "overview") as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Template assignment state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Message Client state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [clientMessageText, setClientMessageText] = useState("");
  const [messageSentStatus, setMessageSentStatus] = useState(false);

  // Exercise library builder tools
  const [localLibExercises, setLocalLibExercises] = useState<ExerciseLibraryItem[]>(exerciseLibrary);

  // Exercise Side Panel details
  const [sidePanelExId, setSidePanelExId] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Targets Editor state
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [targetCalories, setTargetCalories] = useState(client.calorieTarget);
  const [targetSteps, setTargetSteps] = useState(client.stepTarget);
  const [targetProtein, setTargetProtein] = useState(client.proteinTarget || APP_CONFIG.DEFAULT_PROTEIN_TARGET);
  const [targetCarbs, setTargetCarbs] = useState(client.carbsTarget || APP_CONFIG.DEFAULT_CARBS_TARGET);
  const [targetFats, setTargetFats] = useState(client.fatsTarget || APP_CONFIG.DEFAULT_FATS_TARGET);
  const [savingTargets, setSavingTargets] = useState(false);

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTargets(true);
    const res = await updateClientTargets(
      client.id,
      targetCalories,
      targetSteps,
      targetProtein,
      targetCarbs,
      targetFats
    );
    if (res.success) {
      setShowTargetsModal(false);
      router.refresh();
    } else {
      alert("Failed to update client targets.");
    }
    setSavingTargets(false);
  };

  // Sync activeTab state to URL search parameters to persist across reloads
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab) {
        url.searchParams.set("tab", activeTab);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [activeTab]);




  // Calculate stats for header & timeline
  const checkInsWithWeight = checkIns.filter((c) => c.weight !== null) as (CheckIn & { weight: number })[];
  const latestWeight = checkInsWithWeight[0]?.weight ?? null;
  const oldestWeight = checkInsWithWeight[checkInsWithWeight.length - 1]?.weight ?? null;
  const weightDiff = (latestWeight !== null && oldestWeight !== null) ? latestWeight - oldestWeight : null;
  const dietAdherenceDays = checkIns.filter(c => c.dietAdherence).length;
  const complianceRateText = checkIns.length > 0 ? `${Math.round((dietAdherenceDays / checkIns.length) * 100)}%` : "—";
  const complianceRateNum = checkIns.length > 0 ? Math.round((dietAdherenceDays / checkIns.length) * 100) : 0;

  const [weekNum] = useState(() => {
    const msDiff = Date.now() - new Date(client.createdAt).getTime();
    return Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24 * 7)));
  });

  // Instagram-style timeline events builder
  const buildTimelineEvents = () => {
    const events: { date: string; type: "weight" | "workout" | "photo" | "checkin"; title: string; subtitle: string; rawDate: Date }[] = [];
    
    checkIns.forEach((c) => {
      if (c.sleepHours !== null || c.energyScore !== null) {
        events.push({
          date: c.date,
          type: "checkin",
          title: "Daily Check-in Submitted",
          subtitle: `Sleep: ${c.sleepHours ?? "N/A"}h, Energy: ${c.energyScore ?? "N/A"}/10, Nutrition: ${c.dietAdherence ? "Strict" : "Missed Target"}`,
          rawDate: new Date(c.date)
        });
      }
      if (c.weight) {
        events.push({
          date: c.date,
          type: "weight",
          title: "Bodyweight Tracked",
          subtitle: `Logged ${c.weight} kg`,
          rawDate: new Date(c.date)
        });
      }
    });

    // Group logs by date to avoid set-level cluttering in visual timeline
    const logDates = Array.from(new Set(workoutLogs.map((l) => l.date.split("T")[0])));
    logDates.forEach((dStr) => {
      const dayLogs = workoutLogs.filter((l) => l.date.startsWith(dStr));
      if (dayLogs.length > 0) {
        events.push({
          date: dayLogs[0].date,
          type: "workout",
          title: `${dayLogs[0].workoutDayName || "Workout Session"} Completed`,
          subtitle: `Logged ${dayLogs.length} sets completed`,
          rawDate: new Date(dayLogs[0].date)
        });
      }
    });

    photos.forEach((p) => {
      events.push({
        date: p.date,
        type: "photo",
        title: "Progress Photo Uploaded",
        subtitle: "Visual profile updated",
        rawDate: new Date(p.date)
      });
    });

    events.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return events;
  };

  const timelineEvents = buildTimelineEvents();

  // Helper: format dates in timeline
  const formatEventDate = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Assign template
  const handleAssignTemplate = async () => {
    if (!selectedTemplateId) return;
    setAssigning(true);
    setAssignError(null);
    const res = await assignPlanToClient(client.id, selectedTemplateId);
    if (res.success) {
      router.refresh();
    } else {
      setAssignError("Failed to assign plan template.");
    }
    setAssigning(false);
  };

  // Message client via WhatsApp (no fake SMS)
  const handleSendMessage = () => {
    if (!clientMessageText.trim()) return;
    const cleanPhone = client.phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(clientMessageText.trim())}`;
    window.open(url, "_blank");
    setClientMessageText("");
    setShowMessageModal(false);
  };

  // Video Upload Handler for side details panel
  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    exerciseId: string,
    type: "main" | "side" | "mistakes"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultString = reader.result as string;
        const base64Data = resultString.split(",")[1];
        const fileName = `${exerciseId}_${type}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

        const res = await uploadExerciseVideo(exerciseId, type, fileName, base64Data);
        if (res.success && res.url) {
          setLocalLibExercises((prev) =>
            prev.map((ex) => {
              if (ex.id === exerciseId) {
                if (type === "main") return { ...ex, videoMain: res.url };
                if (type === "side") return { ...ex, videoSide: res.url };
                if (type === "mistakes") return { ...ex, videoMistakes: res.url };
              }
              return ex;
            })
          );
          alert("Video demonstration uploaded successfully.");
        } else {
          alert(`Upload failed: ${res.error || "Unknown error"}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Error during upload: ${errorMessage}`);
      } finally {
        setUploadingVideo(false);
      }
    };
    reader.onerror = () => {
      alert("Failed to read upload file.");
      setUploadingVideo(false);
    };
    reader.readAsDataURL(file);
  };

  const sidePanelEx = localLibExercises.find(ex => ex.id === sidePanelExId);

  return (
    <div className="flex-col gap-md" style={{ paddingBottom: "100px", position: "relative" }}>
      
      {/* Sticky Profile Header Row */}
      <header 
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "rgba(10, 10, 10, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-frosted)",
          padding: "16px 20px",
          margin: "0 -20px 16px -20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}
      >
        {/* Top row: Back button & Sync state */}
        <div className="flex-row justify-between items-center w-full">
          <Link 
            href="/trainer/clients" 
            className="flex-row items-center gap-xs"
            style={{ 
              color: "var(--accent-muted)", 
              textDecoration: "none", 
              fontSize: "12px", 
              fontWeight: 500,
              transition: "color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-white)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--accent-muted)"}
          >
            <ArrowLeft size={14} />
            Back to Client Directory
          </Link>
          
          <span className="text-heading" style={{ fontSize: "12px", color: "var(--accent-white)", letterSpacing: "0.1em", fontWeight: 700 }}>
            {APP_CONFIG.BRAND_NAME}
          </span>
        </div>

        {/* Profile Identity & Info */}
        <div className="flex-row items-center gap-sm flex-wrap w-full">
          {/* Initials Avatar */}
          <div 
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))",
              border: "1px solid var(--border-frosted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--accent-white)",
              fontFamily: "var(--font-heading)"
            }}
          >
            {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>

          <div className="flex-col" style={{ flex: 1, minWidth: "200px" }}>
            <div className="flex-row items-center gap-xs flex-wrap">
              <h1 className="text-heading" style={{ fontSize: "18px", margin: 0, fontWeight: 700, whiteSpace: "nowrap" }}>
                {client.name}
              </h1>
              


              {/* Goal Pill */}
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-frosted)",
                  color: "var(--accent-muted)",
                  textTransform: "uppercase",
                  lineHeight: 1
                }}
              >
                {client.goal.replace("_", " ")}
              </span>
            </div>

            {/* Subtitle details */}
            <div className="flex-row items-center gap-xs flex-wrap" style={{ fontSize: "11px", color: "var(--accent-muted)", marginTop: "2px", lineHeight: "1.3" }}>
              <span>Week {weekNum}</span>
              {client.phone && (
                <>
                  <span>•</span>
                  <span>{client.phone}</span>
                </>
              )}
              {client.currentPlanName && (
                <>
                  <span>•</span>
                  <span>Plan: {client.currentPlanName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Metrics Summary - Full width below the name, grid-based layout */}
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "8px", 
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            borderRadius: "8px",
            padding: "8px 12px"
          }}
        >
          <div className="flex-col justify-center">
            <span style={{ fontSize: "10px", color: "var(--accent-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>Weight</span>
            <strong style={{ fontSize: "14px", color: "var(--accent-white)", marginTop: "2px" }}>
              {latestWeight !== null ? `${latestWeight} kg` : "—"}
            </strong>
          </div>

          <div className="flex-col justify-center">
            <span style={{ fontSize: "10px", color: "var(--accent-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>Trend</span>
            <strong 
              style={{ 
                fontSize: "14px", 
                color: weightDiff === null || weightDiff === 0 
                  ? "var(--accent-muted)" 
                  : weightDiff > 0 
                    ? "var(--status-yellow)" 
                    : "var(--status-green)", 
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "2px"
              }}
            >
              {weightDiff !== null && weightDiff !== 0 ? (
                <>
                  <TrendingUp size={12} style={{ transform: weightDiff < 0 ? "scaleY(-1)" : "none" }} />
                  {weightDiff > 0 ? `+${weightDiff.toFixed(1)} kg` : `${weightDiff.toFixed(1)} kg`}
                </>
              ) : (
                "—"
              )}
            </strong>
          </div>

          <div className="flex-col justify-center">
            <span style={{ fontSize: "10px", color: "var(--accent-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>Adherence</span>
            <strong 
              style={{ 
                fontSize: "14px", 
                color: complianceRateNum >= 80 
                  ? "var(--status-green)" 
                  : complianceRateNum >= 50 
                    ? "var(--status-yellow)" 
                    : "var(--status-red)", 
                marginTop: "2px" 
              }}
            >
              {complianceRateText}
            </strong>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="flex-row items-center gap-xs flex-wrap w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "8px" }}>
          <Link
            href={`/trainer/clients/${client.id}/plan`}
            className="btn-primary"
            style={{ 
              fontSize: "12px", 
              height: "32px", 
              padding: "0 12px", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "6px",
              textDecoration: "none", 
              color: "var(--bg-primary)", 
              fontWeight: 700,
              whiteSpace: "nowrap"
            }}
          >
            <Dumbbell size={13} />
            Plan Workout
          </Link>
          <button 
            onClick={() => setShowTemplateModal(true)} 
            className="btn-secondary" 
            style={{ 
              fontSize: "12px", 
              height: "32px", 
              padding: "0 12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              whiteSpace: "nowrap"
            }}
          >
            <ClipboardList size={13} />
            Assign Plan
          </button>
          <button 
            onClick={() => setShowMessageModal(true)} 
            className="btn-secondary" 
            style={{ 
              fontSize: "12px", 
              height: "32px", 
              padding: "0 12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              whiteSpace: "nowrap"
            }}
          >
            <MessageSquare size={13} />
            Message Client
          </button>
          <button 
            onClick={() => setShowTargetsModal(true)} 
            className="btn-secondary" 
            style={{ 
              fontSize: "12px", 
              height: "32px", 
              padding: "0 12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              whiteSpace: "nowrap"
            }}
          >
            <Edit2 size={13} />
            Edit Targets
          </button>
        </div>
      </header>

      {/* Internal Navigation Sub-nav bar */}
      <nav 
        className="flex-row" 
        style={{ 
          borderBottom: "1px solid var(--border-frosted)", 
          gap: "24px", 
          overflowX: "auto", 
          scrollbarWidth: "none" 
        }}
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "meals", label: "Meal Logs" },
          { id: "progress", label: "Progress" },
          { id: "checkins", label: "Check-ins" },
          { id: "history", label: "Workout History" }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
              }}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                color: isSelected ? "var(--accent-white)" : "var(--accent-muted)",
                borderBottom: isSelected ? "2px solid var(--accent-white)" : "2px solid transparent",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: OVERVIEW SCREEN */}
      {activeTab === "overview" && (
        <OverviewTab
          client={client}
          checkIns={checkIns}
          timelineEvents={timelineEvents}
          formatEventDate={formatEventDate}
          setActiveTab={setActiveTab}
          setShowTemplateModal={setShowTemplateModal}
        />
      )}

      {/* TAB 3: PROGRESS SCREEN */}
      {activeTab === "progress" && (
        <ProgressTab checkIns={checkIns} photos={photos} />
      )}

      {/* TAB: MEAL LOGS */}
      {activeTab === "meals" && (
        <MealLogsTab clientId={client.id} mealLogs={mealLogs} />
      )}

      {/* TAB 4: CHECK-INS DETAIL HISTORY */}
      {activeTab === "checkins" && (
        <CheckInsTab checkIns={checkIns} />
      )}

      {/* TAB 5: WORKOUT HISTORY DETAIL LIST */}
      {activeTab === "history" && (
        <WorkoutHistoryTab workoutLogs={workoutLogs} />
      )}

      {/* TAB 6: AI COMMAND PANEL - Commented Out */}

      {/* MODALS & DRAWERS */}
      <Modals
        clientName={client.name}
        showTemplateModal={showTemplateModal}
        setShowTemplateModal={setShowTemplateModal}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        masterPlanTemplates={masterPlanTemplates}
        assigning={assigning}
        assignError={assignError}
        handleAssignTemplate={handleAssignTemplate}
        showMessageModal={showMessageModal}
        setShowMessageModal={setShowMessageModal}
        clientMessageText={clientMessageText}
        setClientMessageText={setClientMessageText}
        messageSentStatus={messageSentStatus}
        handleSendMessage={handleSendMessage}
        sidePanelExId={sidePanelExId}
        setSidePanelExId={setSidePanelExId}
        sidePanelEx={sidePanelEx}
        uploadingVideo={uploadingVideo}
        handleVideoUpload={handleVideoUpload}
        setLocalLibExercises={setLocalLibExercises}
      />

      {showTargetsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowTargetsModal(false)}
        >
          <div
            className="flex-col gap-md"
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-frosted)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              color: "var(--accent-white)",
              animation: "fadeIn 0.2s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Edit Client Targets</span>
              <button 
                onClick={() => setShowTargetsModal(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="flex-col gap-md">
              <div className="flex-row gap-sm">
                <div className="flex-col gap-xs" style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>CALORIES (KCAL)</label>
                  <input 
                    type="number" 
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(parseInt(e.target.value) || 0)}
                    style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-frosted)", borderRadius: "8px", color: "var(--accent-white)", padding: "8px 12px", outline: "none" }}
                  />
                </div>
                <div className="flex-col gap-xs" style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>STEPS TARGET</label>
                  <input 
                    type="number" 
                    value={targetSteps}
                    onChange={(e) => setTargetSteps(parseInt(e.target.value) || 0)}
                    style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-frosted)", borderRadius: "8px", color: "var(--accent-white)", padding: "8px 12px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ borderTop: "1px dashed var(--border-frosted)", paddingTop: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, display: "block", marginBottom: "10px" }}>MACRONUTRIENT BUDGETS</span>
                
                <div className="flex-col gap-sm">
                  <div className="flex-row items-center justify-between">
                    <label style={{ fontSize: "13px", color: "var(--accent-muted)" }}>Protein Target (g)</label>
                    <input 
                      type="number" 
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(parseInt(e.target.value) || 0)}
                      style={{ width: "90px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-frosted)", borderRadius: "8px", color: "var(--accent-white)", padding: "6px 10px", outline: "none", textAlign: "center" }}
                    />
                  </div>

                  <div className="flex-row items-center justify-between">
                    <label style={{ fontSize: "13px", color: "var(--accent-muted)" }}>Carbs Target (g)</label>
                    <input 
                      type="number" 
                      value={targetCarbs}
                      onChange={(e) => setTargetCarbs(parseInt(e.target.value) || 0)}
                      style={{ width: "90px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-frosted)", borderRadius: "8px", color: "var(--accent-white)", padding: "6px 10px", outline: "none", textAlign: "center" }}
                    />
                  </div>

                  <div className="flex-row items-center justify-between">
                    <label style={{ fontSize: "13px", color: "var(--accent-muted)" }}>Fats Target (g)</label>
                    <input 
                      type="number" 
                      value={targetFats}
                      onChange={(e) => setTargetFats(parseInt(e.target.value) || 0)}
                      style={{ width: "90px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-frosted)", borderRadius: "8px", color: "var(--accent-white)", padding: "6px 10px", outline: "none", textAlign: "center" }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-row gap-sm mt-md">
                <button 
                  type="button" 
                  onClick={() => setShowTargetsModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingTargets}
                  className="btn-primary"
                  style={{ flex: 1, height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "var(--bg-primary)" }}
                >
                  {savingTargets ? "Saving..." : "Save Targets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
