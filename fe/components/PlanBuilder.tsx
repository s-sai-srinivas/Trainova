"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, Search, X, Save, AlertCircle, Edit2, Archive, Copy, Video } from "lucide-react";
import { saveClientCustomPlan, saveMasterPlanDay, addWorkoutDay, deleteWorkoutDay, renameWorkoutDay, archiveExercise, duplicateExercise, uploadExerciseVideo } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";
import { PlanDay, PlannedExercise, ExerciseLibraryItem } from "@/lib/types";
import ExercisePicker from "@/components/ExercisePicker";
import ExerciseGif from "@/components/ExerciseGif";
import { CatalogExercise, catalogGifUrl } from "@/lib/exerciseCatalog";

interface PlanBuilderProps {
  initialDays: PlanDay[];
  exerciseLibrary: ExerciseLibraryItem[];
  isMasterTemplate: boolean;
  clientId?: string;
  planId?: string;
}

export default function PlanBuilder({
  initialDays,
  exerciseLibrary,
  isMasterTemplate,
  clientId,
  planId,
}: PlanBuilderProps) {
  const router = useRouter();
  const [days, setDays] = useState<PlanDay[]>(initialDays);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Bottom drawer exercise library lookup
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("ALL");

  // Local exercise library state to support live video upload updates
  const [libExercises, setLibExercises] = useState<ExerciseLibraryItem[]>(exerciseLibrary);
  const [expandedLibExId, setExpandedLibExId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Save states
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  // Video Upload Handler converting chosen files to base64
  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    exerciseId: string,
    type: "main" | "side" | "mistakes"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > APP_CONFIG.MAX_VIDEO_UPLOAD_MB * 1024 * 1024) {
      alert(`File size exceeds ${APP_CONFIG.MAX_VIDEO_UPLOAD_MB}MB limit.`);
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultString = reader.result as string;
        const base64Data = resultString.split(",")[1];
        const fileName = `${exerciseId}_${type}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

        const res = await uploadExerciseVideo(exerciseId, type, fileName, base64Data);
        if (res.success && res.url) {
          setLibExercises((prev) =>
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
        alert(`Error processing upload: ${errorMessage}`);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Failed to read upload file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddDay = async () => {
    if (!planId) return;
    const name = prompt("Enter new workout day name:", `Day ${days.length + 1}`);
    if (!name || !name.trim()) return;

    setSaving(true);
    const res = await addWorkoutDay(planId, name.trim());
    if (res.success && res.dayId) {
      router.refresh();
    } else {
      alert("Failed to add workout day.");
    }
    setSaving(false);
  };

  const handleRenameDay = async () => {
    if (!activeDay) return;
    const currentName = activeDay.name;
    const name = prompt("Enter new name for this day:", currentName);
    if (!name || !name.trim() || name.trim() === currentName) return;

    setSaving(true);
    const res = await renameWorkoutDay(activeDay.id, name.trim());
    if (res.success) {
      router.refresh();
    } else {
      alert("Failed to rename day.");
    }
    setSaving(false);
  };

  const handleDeleteDay = async () => {
    if (!activeDay) return;
    if (days.length <= 1) {
      alert("A program must contain at least one workout day.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${activeDay.name}" and all its exercises?`)) {
      return;
    }

    setSaving(true);
    const res = await deleteWorkoutDay(activeDay.id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete day.");
    }
    setSaving(false);
  };

  const handleArchiveExercise = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to archive this exercise? It will be hidden from search library lookup.")) return;
    const res = await archiveExercise(id, true);
    if (res.success) {
      router.refresh();
    } else {
      alert("Failed to archive exercise.");
    }
  };

  const handleDuplicateExercise = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await duplicateExercise(id);
    if (res.success) {
      router.refresh();
    } else {
      alert("Failed to duplicate exercise.");
    }
  };

  const activeDay = days[activeDayIndex];

  // Unique muscle groups in library
  const muscleGroups = ["ALL", ...Array.from(new Set(exerciseLibrary.map((ex) => ex.muscleGroup)))];

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    // Format payload for Prisma transaction
    const exercisesPayload = activeDay.exercises.map((ex) => ({
      exerciseId: ex.exerciseId.startsWith("catalog:") ? undefined : ex.exerciseId,
      catalogId: ex.catalogId || (ex.exerciseId.startsWith("catalog:") ? ex.exerciseId.slice(8) : null),
      sets: ex.sets,
      repsRange: ex.repsRange || "—",
      restSeconds: ex.restSeconds ?? 90,
      targetWeight: typeof ex.weight === "string" ? parseFloat(ex.weight) || 0.0 : ex.weight ?? 0.0,
    }));

    let res;
    if (isMasterTemplate) {
      res = await saveMasterPlanDay(activeDay.id, exercisesPayload);
    } else if (clientId) {
      res = await saveClientCustomPlan(clientId, activeDay.id, exercisesPayload);
    } else {
      res = { success: false, error: "ClientId missing for client-specific program." };
    }

    if (res.success) {
      setSaveStatus({ success: true });
      setTimeout(() => {
        setSaveStatus(null);
        if (!isMasterTemplate) {
          router.refresh();
        }
      }, 3000);
    } else {
      setSaveStatus({ success: false, error: res.error || "Save transaction failed" });
    }
    setSaving(false);
  };

  // Adjust progressive overload parameters
  const adjustOverload = (type: "weight" | "reps" | "sets", amount: number) => {
    if (!selectedExerciseId) return;

    setDays((prevDays) =>
      prevDays.map((day, dIdx) => {
        if (dIdx !== activeDayIndex) return day;

        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== selectedExerciseId) return ex;

            if (type === "weight") {
              const curWeight = typeof ex.weight === "string" ? parseFloat(ex.weight) || 0.0 : ex.weight ?? 0.0;
              return { ...ex, weight: Math.max(0, curWeight + amount) };
            } else if (type === "reps") {
              const match = (ex.repsRange || "").match(/(\d+)-?(\d+)?/);
              if (match) {
                const low = Math.max(1, parseInt(match[1]) + amount);
                const high = match[2] ? Math.max(low, parseInt(match[2]) + amount) : null;
                const newRange = high ? `${low}-${high}` : `${low}`;
                return { ...ex, repsRange: newRange };
              }
            } else if (type === "sets") {
              return { ...ex, sets: Math.max(1, ex.sets + amount) };
            }
            return ex;
          }),
        };
      })
    );
  };

  const handleAdjustOverloadValue = (type: "weight" | "reps" | "sets", value: string) => {
    if (!selectedExerciseId) return;

    setDays((prevDays) =>
      prevDays.map((day, dIdx) => {
        if (dIdx !== activeDayIndex) return day;

        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== selectedExerciseId) return ex;

            if (type === "weight") {
              return { ...ex, weight: value };
            } else if (type === "reps") {
              return { ...ex, repsRange: value };
            } else if (type === "sets") {
              const val = parseInt(value);
              return { ...ex, sets: isNaN(val) ? 0 : val };
            }
            return ex;
          }),
        };
      })
    );
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newExercises = [...activeDay.exercises];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newExercises.length) return;

    const temp = newExercises[index];
    newExercises[index] = newExercises[targetIndex];
    newExercises[targetIndex] = temp;

    setDays((prevDays) =>
      prevDays.map((day, dIdx) =>
        dIdx === activeDayIndex ? { ...day, exercises: newExercises } : day
      )
    );
  };

  const deleteExercise = (exId: string) => {
    setDays((prevDays) =>
      prevDays.map((day, dIdx) =>
        dIdx === activeDayIndex
          ? { ...day, exercises: day.exercises.filter((ex) => ex.id !== exId) }
          : day
      )
    );
    if (selectedExerciseId === exId) {
      setSelectedExerciseId(null);
    }
  };

  const handleAddFromCatalog = (cat: CatalogExercise) => {
    const newEx: PlannedExercise = {
      id: `new-${cat.id}-${Date.now()}`,
      exerciseId: `catalog:${cat.id}`,
      catalogId: cat.id,
      name: cat.name,
      sets: 3,
      repsRange: "8-10",
      weight: 0,
      restSeconds: 90,
      coachingCue: cat.target ? `Target: ${cat.target}` : "",
      gifUrl: catalogGifUrl(cat.gif),
      thumbnailUrl: catalogGifUrl(cat.thumb),
      steps: cat.steps,
    };

    setDays((prevDays) =>
      prevDays.map((day, dIdx) =>
        dIdx === activeDayIndex ? { ...day, exercises: [...day.exercises, newEx] } : day
      )
    );
    setSelectedExerciseId(newEx.id);
    setShowDrawer(false);
  };

  const handleAddExerciseFromLibrary = (libEx: ExerciseLibraryItem) => {
    const newEx: PlannedExercise = {
      id: `new-${Date.now()}`,
      exerciseId: libEx.id,
      catalogId: libEx.catalogId,
      name: libEx.name,
      sets: 3,
      repsRange: "8-10",
      weight: 0.0,
      restSeconds: 90,
      coachingCue: libEx.coachingCue || "Keep posture strict.",
      gifUrl: libEx.gifUrl,
      thumbnailUrl: libEx.thumbnailUrl,
      steps: libEx.steps,
    };

    setDays((prevDays) =>
      prevDays.map((day, dIdx) =>
        dIdx === activeDayIndex ? { ...day, exercises: [...day.exercises, newEx] } : day
      )
    );
    setSelectedExerciseId(newEx.id);
    setShowDrawer(false);
  };

  // Filter library exercises
  const filteredLibrary = libExercises.filter((ex) => {
    if (ex.archived) return false;
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = selectedMuscle === "ALL" || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="flex-col gap-md" style={{ paddingBottom: "120px" }}>
      {/* Save status message */}
      {saveStatus && (
        <div 
          style={{
            backgroundColor: saveStatus.success ? "var(--status-green)" : "var(--status-red)",
            color: "black",
            padding: "12px",
            borderRadius: "12px",
            fontWeight: 600,
            textAlign: "center",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          {saveStatus.success ? (
            <span>Workout program day changes successfully persisted in database!</span>
          ) : (
            <>
              <AlertCircle size={16} />
              <span>Error: {saveStatus.error}</span>
            </>
          )}
        </div>
      )}

      {/* Save Action trigger row */}
      <div className="flex-row items-center justify-between">
        <div className="flex-row items-center gap-sm">
          <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
            {activeDay?.exercises?.length || 0} movements assigned
          </span>
          {activeDay && planId && (
            <div className="flex-row items-center gap-xs ml-sm" style={{ borderLeft: "1px solid var(--border-frosted)", paddingLeft: "8px", display: "flex" }}>
              <button
                onClick={handleRenameDay}
                title="Rename Day"
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-muted)", display: "flex", alignItems: "center", cursor: "pointer" }}
              >
                <Edit2 size={15} />
              </button>
              {days.length > 1 && (
                <button
                  onClick={handleDeleteDay}
                  title="Delete Day"
                  className="touch-action"
                  style={{ background: "none", border: "none", color: "var(--status-red)", display: "flex", alignItems: "center", cursor: "pointer" }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !activeDay}
          className="btn-primary flex-row items-center gap-sm"
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          <Save size={16} />
          {saving ? "Persisting..." : "Save Program Changes"}
        </button>
      </div>

      {/* Horizontal Day Selector */}
      <div 
        className="flex-row" 
        style={{ 
          overflowX: "auto", 
          gap: "8px", 
          paddingBottom: "8px", 
          borderBottom: "1px solid var(--border-frosted)",
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}
      >
        {days.map((day, idx) => (
          <button
            key={day.id}
            onClick={() => {
              setActiveDayIndex(idx);
              setSelectedExerciseId(null);
              setSaveStatus(null);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px solid var(--border-frosted)",
              backgroundColor: activeDayIndex === idx ? "var(--accent-white)" : "var(--bg-surface-glass)",
              color: activeDayIndex === idx ? "var(--bg-primary)" : "var(--accent-white)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {day.name}
          </button>
        ))}
        {planId && (
          <button
            onClick={handleAddDay}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px dashed var(--border-frosted)",
              backgroundColor: "transparent",
              color: "var(--accent-white)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Plus size={14} /> Day
          </button>
        )}
      </div>

      {/* Program Canvas Builder */}
      <div className="flex-col gap-sm">
        {activeDay.exercises.length === 0 ? (
          <div className="glass-card flex-col items-center justify-center p-4 text-center" style={{ minHeight: "150px" }}>
            <span style={{ color: "var(--accent-muted)", fontSize: "14px" }}>
              No exercises added for this day. Click Add Exercise below to fetch from library.
            </span>
          </div>
        ) : (
          activeDay.exercises.map((ex, index) => {
            const isSelected = selectedExerciseId === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExerciseId(ex.id)}
                className="glass-card flex-row items-center gap-sm clickable"
                style={{
                  border: isSelected ? "1px solid var(--accent-white)" : "1px solid var(--border-frosted)",
                  backgroundColor: isSelected ? "rgba(255, 255, 255, 0.02)" : "var(--bg-surface-glass)"
                }}
              >
                <div className="flex-col gap-sm" style={{ color: "var(--accent-muted)" }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveExercise(index, "up"); }}
                    disabled={index === 0}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <GripVertical size={18} />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveExercise(index, "down"); }}
                    disabled={index === activeDay.exercises.length - 1}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: index === activeDay.exercises.length - 1 ? 0.3 : 1 }}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                <ExerciseGif gifUrl={ex.gifUrl} thumbnailUrl={ex.thumbnailUrl} name={ex.name} size={56} />
                <div className="flex-col" style={{ flex: 1, gap: "4px", paddingLeft: "8px" }}>
                  <span className="text-heading" style={{ fontSize: "16px", textTransform: "capitalize" }}>{ex.name}</span>
                  <div className="flex-row gap-sm" style={{ fontSize: "13px", color: "var(--accent-muted)", flexWrap: "wrap" }}>
                    <span>{ex.sets} Sets</span>
                    <span>•</span>
                    <span>{ex.repsRange} Reps</span>
                    <span>•</span>
                    <span>{parseFloat(String(ex.weight)) > 0 ? `${parseFloat(String(ex.weight)).toFixed(1)}kg` : "—"}</span>
                    <span>•</span>
                    <span>{ex.restSeconds}s Rest</span>
                  </div>
                  {ex.coachingCue && (
                    <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontStyle: "italic", marginTop: "2px" }}>
                      Cue: {ex.coachingCue}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); deleteExercise(ex.id); }}
                  className="touch-action"
                  style={{ background: "none", border: "none", color: "var(--status-red)", display: "flex", alignItems: "center" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}

        <button
          onClick={() => setShowDrawer(true)}
          className="btn-secondary flex-row items-center justify-center gap-sm w-full mt-md"
          style={{ borderStyle: "dashed" }}
        >
          <Plus size={18} />
          Add Exercise
        </button>
      </div>

      {/* Pinned progressive overload adjusters footer */}
      {selectedExerciseId && (
        <div 
          style={{
            position: "fixed",
            bottom: "64px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "430px",
            backgroundColor: "var(--bg-primary)",
            borderTop: "1px solid var(--border-frosted)",
            padding: "16px",
            zIndex: 90,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 -4px 15px rgba(0,0,0,0.5)"
          }}
        >
          <div className="flex-row justify-between items-center">
            <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Progressive Overload Adjuster
            </span>
            <span style={{ fontSize: "12px", color: "var(--accent-white)", fontWeight: 600 }}>
              {activeDay.exercises.find((e) => e.id === selectedExerciseId)?.name}
            </span>
          </div>

          <div className="flex-row gap-sm" style={{ width: "100%" }}>
            <div className="flex-col" style={{ flex: 1, gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", textAlign: "center", fontWeight: 600 }}>WEIGHT (kg)</span>
              <input
                type="text"
                placeholder="e.g. 75"
                value={activeDay.exercises.find((e) => e.id === selectedExerciseId)?.weight === 0 || activeDay.exercises.find((e) => e.id === selectedExerciseId)?.weight === 0.0 ? "" : activeDay.exercises.find((e) => e.id === selectedExerciseId)?.weight || ""}
                onChange={(e) => handleAdjustOverloadValue("weight", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  height: "32px",
                  fontSize: "13px",
                  textAlign: "center",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--accent-white)",
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "6px",
                  width: "100%"
                }}
              />
              <div className="flex-row gap-xs">
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("weight", -2.5); }} className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>-2.5k</button>
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("weight", 2.5); }} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>+2.5k</button>
              </div>
            </div>

            <div className="flex-col" style={{ flex: 1, gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", textAlign: "center", fontWeight: 600 }}>REPS</span>
              <input
                type="text"
                placeholder="e.g. 8-10"
                value={activeDay.exercises.find((e) => e.id === selectedExerciseId)?.repsRange === "—" ? "" : activeDay.exercises.find((e) => e.id === selectedExerciseId)?.repsRange || ""}
                onChange={(e) => handleAdjustOverloadValue("reps", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  height: "32px",
                  fontSize: "13px",
                  textAlign: "center",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--accent-white)",
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "6px",
                  width: "100%"
                }}
              />
              <div className="flex-row gap-xs">
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("reps", -1); }} className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>-1</button>
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("reps", 1); }} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>+1</button>
              </div>
            </div>

            <div className="flex-col" style={{ flex: 1, gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--accent-muted)", textAlign: "center", fontWeight: 600 }}>SETS</span>
              <input
                type="text"
                placeholder="e.g. 3"
                value={activeDay.exercises.find((e) => e.id === selectedExerciseId)?.sets || ""}
                onChange={(e) => handleAdjustOverloadValue("sets", e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  height: "32px",
                  fontSize: "13px",
                  textAlign: "center",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--accent-white)",
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "6px",
                  width: "100%"
                }}
              />
              <div className="flex-row gap-xs">
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("sets", -1); }} className="btn-secondary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>-1</button>
                <button onClick={(e) => { e.stopPropagation(); adjustOverload("sets", 1); }} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px", height: "26px" }}>+1</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise library sliding drawer sheet (Task 6 details) */}
      {showDrawer && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: `rgba(0, 0, 0, ${APP_CONFIG.MODAL_BACKDROP_OPACITY})`,
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end"
          }}
          onClick={() => setShowDrawer(false)}
        >
          <div 
            className="flex-col gap-md"
            style={{
              width: "100%",
              maxWidth: "430px",
              margin: "0 auto",
              backgroundColor: "var(--bg-primary)",
              borderTop: "1px solid var(--border-frosted)",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "24px",
              height: "80vh",
              animation: "slideUp 0.3s ease-out",
              color: "var(--accent-white)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Add movement</span>
              <button 
                onClick={() => setShowDrawer(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              <ExercisePicker onPick={handleAddFromCatalog} />
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", width: "100%", display: "none" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)", display: "flex", alignItems: "center" }}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Type exercise name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "38px" }}
              />
            </div>

            {/* Muscle Category Selector */}
            <div 
              className="flex-row" 
              style={{ 
                overflowX: "auto", 
                gap: "8px", 
                paddingBottom: "8px",
                scrollbarWidth: "none"
              }}
            >
              {muscleGroups.map((muscle) => (
                <button
                  key={muscle}
                  onClick={() => setSelectedMuscle(muscle)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-frosted)",
                    backgroundColor: selectedMuscle === muscle ? "var(--accent-white)" : "transparent",
                    color: selectedMuscle === muscle ? "var(--bg-primary)" : "var(--accent-white)",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {muscle}
                </button>
              ))}
            </div>

            {/* Scrollable list of matches */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "20px" }}>
              {filteredLibrary.length === 0 ? (
                <span style={{ color: "var(--accent-muted)", fontSize: "14px", textAlign: "center", marginTop: "24px" }}>
                  No matching exercises found in library.
                </span>
              ) : (
                filteredLibrary.map((libEx) => (
                  <div
                    key={libEx.id}
                    onClick={() => setExpandedLibExId(expandedLibExId === libEx.id ? null : libEx.id)}
                    className="glass-card flex-col clickable"
                    style={{ 
                      padding: "16px",
                      border: expandedLibExId === libEx.id ? "1px solid var(--accent-white)" : "1px solid var(--border-frosted)",
                      backgroundColor: expandedLibExId === libEx.id ? "rgba(255, 255, 255, 0.02)" : "var(--bg-surface-glass)"
                    }}
                  >
                    {/* Top row with details and quick action icons */}
                    <div className="flex-row justify-between items-center w-full">
                      <div className="flex-col" style={{ gap: "4px", flex: 1, paddingRight: "8px" }}>
                        <span style={{ fontWeight: 600, fontSize: "15px" }}>{libEx.name}</span>
                        <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>
                          {libEx.muscleGroup} • {libEx.equipmentType}
                        </span>
                      </div>
                      <div className="flex-row items-center gap-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDuplicateExercise(libEx.id, e)}
                          title="Duplicate Exercise"
                          className="touch-action"
                          style={{
                            background: "var(--bg-surface-glass)",
                            border: "1px solid var(--border-frosted)",
                            borderRadius: "8px",
                            color: "var(--accent-white)",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={(e) => handleArchiveExercise(libEx.id, e)}
                          title="Archive Exercise"
                          className="touch-action"
                          style={{
                            background: "var(--bg-surface-glass)",
                            border: "1px solid var(--border-frosted)",
                            borderRadius: "8px",
                            color: "var(--status-red)",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          onClick={() => handleAddExerciseFromLibrary(libEx)}
                          title="Add Exercise"
                          className="touch-action"
                          style={{
                            background: "var(--accent-white)",
                            border: "none",
                            borderRadius: "8px",
                            color: "var(--bg-primary)",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom row displaying video uploads when card is clicked/expanded */}
                    {expandedLibExId === libEx.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex-col gap-md"
                        style={{ 
                          width: "100%", 
                          paddingTop: "16px", 
                          borderTop: "1px solid var(--border-frosted)", 
                          marginTop: "12px",
                          animation: "fadeIn 0.2s ease-out" 
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Coaching Demonstration Clips
                        </span>

                        {uploading && (
                          <div style={{ fontSize: "12px", color: "var(--status-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className="spinner" style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            <span>Uploading video...</span>
                          </div>
                        )}

                        <div className="flex-row gap-sm" style={{ width: "100%", alignItems: "stretch" }}>
                          {/* Main demo video container */}
                          <div className="flex-col gap-xs" style={{ flex: 1, minWidth: "0" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-white)" }}>Main Demo</span>
                            {libEx.videoMain ? (
                              <video 
                                src={libEx.videoMain} 
                                controls 
                                playsInline
                                preload="metadata"
                                style={{ width: "100%", height: "80px", borderRadius: "8px", backgroundColor: "#000", objectFit: "cover" }} 
                              />
                            ) : (
                              <div style={{ width: "100%", height: "80px", borderRadius: "8px", border: "1px dashed var(--border-frosted)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
                                <span style={{ fontSize: "10px", color: "var(--accent-muted)", width: "100%", textAlign: "center" }}>No Video</span>
                              </div>
                            )}
                            <label className="btn-secondary touch-action flex-row items-center justify-center gap-xs" style={{ fontSize: "11px", padding: "6px", minHeight: "44px", cursor: "pointer", width: "100%" }}>
                              <Video size={12} />
                              <span>{libEx.videoMain ? "Replace" : "Upload"}</span>
                              <input 
                                type="file" 
                                accept="video/*" 
                                onChange={(e) => handleVideoUpload(e, libEx.id, "main")} 
                                style={{ display: "none" }} 
                                disabled={uploading}
                              />
                            </label>
                          </div>

                          {/* Side view video container */}
                          <div className="flex-col gap-xs" style={{ flex: 1, minWidth: "0" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-white)" }}>Side View</span>
                            {libEx.videoSide ? (
                              <video 
                                src={libEx.videoSide} 
                                controls 
                                playsInline
                                preload="metadata"
                                style={{ width: "100%", height: "80px", borderRadius: "8px", backgroundColor: "#000", objectFit: "cover" }} 
                              />
                            ) : (
                              <div style={{ width: "100%", height: "80px", borderRadius: "8px", border: "1px dashed var(--border-frosted)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
                                <span style={{ fontSize: "10px", color: "var(--accent-muted)", width: "100%", textAlign: "center" }}>No Video</span>
                              </div>
                            )}
                            <label className="btn-secondary touch-action flex-row items-center justify-center gap-xs" style={{ fontSize: "11px", padding: "6px", minHeight: "44px", cursor: "pointer", width: "100%" }}>
                              <Video size={12} />
                              <span>{libEx.videoSide ? "Replace" : "Upload"}</span>
                              <input 
                                type="file" 
                                accept="video/*" 
                                onChange={(e) => handleVideoUpload(e, libEx.id, "side")} 
                                style={{ display: "none" }} 
                                disabled={uploading}
                              />
                            </label>
                          </div>

                          {/* Mistakes video container */}
                          <div className="flex-col gap-xs" style={{ flex: 1, minWidth: "0" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-white)" }}>Mistakes</span>
                            {libEx.videoMistakes ? (
                              <video 
                                src={libEx.videoMistakes} 
                                controls 
                                playsInline
                                preload="metadata"
                                style={{ width: "100%", height: "80px", borderRadius: "8px", backgroundColor: "#000", objectFit: "cover" }} 
                              />
                            ) : (
                              <div style={{ width: "100%", height: "80px", borderRadius: "8px", border: "1px dashed var(--border-frosted)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
                                <span style={{ fontSize: "10px", color: "var(--accent-muted)", width: "100%", textAlign: "center" }}>No Video</span>
                              </div>
                            )}
                            <label className="btn-secondary touch-action flex-row items-center justify-center gap-xs" style={{ fontSize: "11px", padding: "6px", minHeight: "44px", cursor: "pointer", width: "100%" }}>
                              <Video size={12} />
                              <span>{libEx.videoMistakes ? "Replace" : "Upload"}</span>
                              <input 
                                type="file" 
                                accept="video/*" 
                                onChange={(e) => handleVideoUpload(e, libEx.id, "mistakes")} 
                                style={{ display: "none" }} 
                                disabled={uploading}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
