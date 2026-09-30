"use client";

import { useState, useMemo, useRef } from "react";
import { logClientDailyCheckIn, logClientWorkoutSession, saveDailySteps } from "@/app/actions";
import { Check, Flame, Award, Dumbbell, ClipboardCheck, Utensils, Coffee } from "lucide-react";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/config";
import ExerciseGif from "@/components/ExerciseGif";
import { EXERCISE_ATTRIBUTION } from "@/lib/exerciseCatalog";



import { PlanDay, CheckIn, MealLogData } from "@/lib/types";

interface TodayWorkspaceProps {
  client: {
    id: string;
    name: string;
    goal: string;
    calorieTarget: number;
    stepTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatsTarget: number;
    currentPlanId: string | null;
  };
  clientPlanDays: PlanDay[];
  initialCheckIns: CheckIn[];
  mealLogs?: MealLogData[];
  todaySetLogs?: {
    planDayId: string;
    exerciseName: string;
    setNumber: number;
    weight: number;
    reps: number;
  }[];
  hasCheckinToday?: boolean;
}

function hydrateFromLogs(
  day: PlanDay | undefined,
  logs: TodayWorkspaceProps["todaySetLogs"] = []
) {
  const done: Record<string, Record<number, boolean>> = {};
  const weights: Record<string, Record<number, string>> = {};
  const reps: Record<string, Record<number, string>> = {};
  if (!day) return { done, weights, reps };
  const dayLogs = logs.filter((l) => l.planDayId === day.id);
  day.exercises.forEach((ex) => {
    done[ex.id] = {};
    weights[ex.id] = {};
    reps[ex.id] = {};
    for (let i = 0; i < ex.sets; i++) {
      const log = dayLogs.find(
        (l) => l.exerciseName.toLowerCase() === ex.name.toLowerCase() && l.setNumber === i + 1
      );
      if (log) {
        done[ex.id][i] = true;
        weights[ex.id][i] = String(log.weight);
        reps[ex.id][i] = String(log.reps);
      }
    }
  });
  return { done, weights, reps };
}

export default function TodayWorkspace({
  client,
  clientPlanDays,
  initialCheckIns,
  mealLogs = [],
  todaySetLogs = [],
  hasCheckinToday = false,
}: TodayWorkspaceProps) {
  // Navigation tabs checkin sheets
  const [showCheckinSheet, setShowCheckinSheet] = useState(false);
  // Prefill weight with latest check-in weight, fallback to 75.0
  const latestWeight = initialCheckIns.find((c: CheckIn) => c.weight !== null)?.weight ?? APP_CONFIG.DEFAULT_WEIGHT_FALLBACK;
  const [weight, setWeight] = useState(latestWeight.toString());
  const [sleep, setSleep] = useState("8");
  const [energy, setEnergy] = useState("8");
  const [dietAdherence, setDietAdherence] = useState(true);
  const [notes, setNotes] = useState("");
  const [checkinLogging, setCheckinLogging] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinLogged, setCheckinLogged] = useState(hasCheckinToday);
  const workoutRef = useRef<HTMLElement | null>(null);

  // Filter out days that have 0 exercises
  const activePlanDaysWithExercises = useMemo(() => {
    return clientPlanDays.filter((d) => d.exercises && d.exercises.length > 0);
  }, [clientPlanDays]);

  // Active workout states
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    const getLocalDateString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${date}`;
    };
    const localToday = getLocalDateString();
    const activeDays = clientPlanDays.filter((d) => d.exercises && d.exercises.length > 0);
    const todayWorkout = activeDays.find((d) => d.scheduledDate === localToday);
    return todayWorkout ? todayWorkout.id : (activeDays[0]?.id || "");
  });

  // Sync selectedDayId when clientPlanDays changes (render-phase state adjustment)
  const [prevPlanDays, setPrevPlanDays] = useState(clientPlanDays);
  if (clientPlanDays !== prevPlanDays) {
    setPrevPlanDays(clientPlanDays);
    const activeDays = clientPlanDays.filter((d) => d.exercises && d.exercises.length > 0);
    const isCurrentSelectionValid = selectedDayId && activeDays.some((d) => d.id === selectedDayId);
    if (!isCurrentSelectionValid) {
      const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const date = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${date}`;
      };
      const localToday = getLocalDateString();
      const todayWorkout = activeDays.find((d) => d.scheduledDate === localToday);
      setSelectedDayId(todayWorkout ? todayWorkout.id : (activeDays[0]?.id || ""));
    }
  }

  // Filter and sort days for dropdown: only show scheduled days if there are any, sorted descending by date
  const dropdownDays = useMemo(() => {
    const scheduledDays = activePlanDaysWithExercises.filter((d) => d.scheduledDate);
    return scheduledDays.length > 0
      ? [...scheduledDays].sort((a, b) => new Date(b.scheduledDate!).getTime() - new Date(a.scheduledDate!).getTime())
      : activePlanDaysWithExercises;
  }, [activePlanDaysWithExercises]);
  const initialHydrate = hydrateFromLogs(
    clientPlanDays.find((d) => d.id === selectedDayId),
    todaySetLogs
  );
  const [completedSets, setCompletedSets] = useState<Record<string, Record<number, boolean>>>(initialHydrate.done);
  const [workoutWeights, setWorkoutWeights] = useState<Record<string, Record<number, string>>>(initialHydrate.weights);
  const [workoutReps, setWorkoutReps] = useState<Record<string, Record<number, string>>>(initialHydrate.reps);
  const [workoutLogging, setWorkoutLogging] = useState(false);
  const [workoutSuccess, setWorkoutSuccess] = useState(false);
  const [savedSetCount, setSavedSetCount] = useState(todaySetLogs.length);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter meal logs for today (local time)
  const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const todayMealLogs = (mealLogs || []).filter(
    (log: MealLogData) => new Date(log.loggedAt).getTime() >= getTodayStart()
  );

  // Steps tracking state
  const [loggedSteps, setLoggedSteps] = useState("0");
  const [stepsSuccess, setStepsSuccess] = useState(false);

  // Initialize prefilled weights and reps when selecting a day
  const activeDay = clientPlanDays.find((d) => d.id === selectedDayId);

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinLogging(true);
    const res = await logClientDailyCheckIn(
      parseFloat(weight) || 0,
      parseFloat(sleep) || 0,
      parseInt(energy) || 0,
      dietAdherence,
      notes
    );

    if (res.success) {
      setCheckinSuccess(true);
      setCheckinLogged(true);
      setTimeout(() => {
        setCheckinSuccess(false);
        setShowCheckinSheet(false);
      }, 2000);
    } else {
      setErrorMessage("Failed to submit check-in log.");
    }
    setCheckinLogging(false);
  };

  const buildSetsPayload = (
    day: PlanDay,
    done: Record<string, Record<number, boolean>>,
    weights: Record<string, Record<number, string>>,
    reps: Record<string, Record<number, string>>
  ) => {
    const setsPayload: {
      exerciseName: string;
      setNumber: number;
      weight: number;
      reps: number;
      targetWeight: number;
      targetReps: number;
    }[] = [];

    day.exercises.forEach((ex) => {
      for (let i = 0; i < ex.sets; i++) {
        if (!done[ex.id]?.[i]) continue;
        const targetWVal = typeof ex.weight === "string" ? parseFloat(ex.weight) || 0 : ex.weight ?? 0;
        const targetWStr = targetWVal > 0 ? targetWVal.toString() : "";
        const repsRangeVal = ex.repsRange || "";
        setsPayload.push({
          exerciseName: ex.name,
          setNumber: i + 1,
          weight: parseFloat(weights[ex.id]?.[i] || targetWStr) || 0,
          reps: parseInt(reps[ex.id]?.[i] || (repsRangeVal && repsRangeVal !== "—" && repsRangeVal !== "-" ? repsRangeVal.split("-")[0] : "")) || 0,
          targetWeight: targetWVal,
          targetReps: parseInt(repsRangeVal.split("-")[0]) || 0,
        });
      }
    });
    return setsPayload;
  };

  const persistSets = async (
    day: PlanDay,
    done: Record<string, Record<number, boolean>>,
    weights: Record<string, Record<number, string>>,
    reps: Record<string, Record<number, string>>
  ) => {
    const setsPayload = buildSetsPayload(day, done, weights, reps);
    const res = await logClientWorkoutSession(day.id, APP_CONFIG.DEFAULT_WORKOUT_NOTES, setsPayload);
    if (res.success) {
      setSavedSetCount(setsPayload.length);
      setWorkoutSuccess(true);
      setTimeout(() => setWorkoutSuccess(false), 1500);
    } else {
      setErrorMessage(res.error || "Failed to save sets.");
    }
  };

  const handleSetToggle = (exId: string, setIdx: number) => {
    if (!activeDay) return;
    const next = { ...completedSets, [exId]: { ...(completedSets[exId] || {}) } };
    next[exId][setIdx] = !next[exId][setIdx];
    setCompletedSets(next);
    void persistSets(activeDay, next, workoutWeights, workoutReps);
  };

  const handleWeightChange = (exId: string, setIdx: number, val: string) => {
    const next = { ...workoutWeights, [exId]: { ...(workoutWeights[exId] || {}) } };
    next[exId][setIdx] = val;
    setWorkoutWeights(next);
    if (activeDay && completedSets[exId]?.[setIdx]) {
      void persistSets(activeDay, completedSets, next, workoutReps);
    }
  };

  const handleRepsChange = (exId: string, setIdx: number, val: string) => {
    const next = { ...workoutReps, [exId]: { ...(workoutReps[exId] || {}) } };
    next[exId][setIdx] = val;
    setWorkoutReps(next);
    if (activeDay && completedSets[exId]?.[setIdx]) {
      void persistSets(activeDay, completedSets, workoutWeights, next);
    }
  };

  const handleWorkoutSubmit = async () => {
    if (!activeDay || workoutLogging) return;
    const setsPayload = buildSetsPayload(activeDay, completedSets, workoutWeights, workoutReps);
    if (setsPayload.length === 0) {
      setErrorMessage("Tick at least one set.");
      return;
    }
    setWorkoutLogging(true);
    await persistSets(activeDay, completedSets, workoutWeights, workoutReps);
    setWorkoutLogging(false);
  };

  // Calorie and Macro calculation based on actual logged meals
  const calorieTargetVal = client.calorieTarget || APP_CONFIG.DEFAULT_CALORIE_TARGET;
  const proteinTargetVal = client.proteinTarget || APP_CONFIG.DEFAULT_PROTEIN_TARGET;
  const carbsTargetVal = client.carbsTarget || APP_CONFIG.DEFAULT_CARBS_TARGET;
  const fatsTargetVal = client.fatsTarget || APP_CONFIG.DEFAULT_FATS_TARGET;

  const currentCalories = todayMealLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const currentProtein = todayMealLogs.reduce((acc, curr) => acc + curr.protein, 0);
  const currentCarbs = todayMealLogs.reduce((acc, curr) => acc + curr.carbs, 0);
  const currentFats = todayMealLogs.reduce((acc, curr) => acc + curr.fats, 0);

  const calPct = Math.round((currentCalories / calorieTargetVal) * 100) || 0;
  const stepsPct = Math.round((parseInt(loggedSteps) / client.stepTarget) * 100) || 0;

  return (
    <div className="flex-col gap-md">
      {/* Welcome banner */}
      <section className="glass-card flex-row justify-between items-center" style={{ padding: "16px", marginBottom: "4px" }}>
        <div className="flex-col gap-xs">
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>ATHLETE PORTAL</span>
          <h1 className="text-heading" style={{ fontSize: "24px", letterSpacing: "-0.5px" }}>{client.name}</h1>
        </div>
        <button
          onClick={() => setShowCheckinSheet(true)}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "13px", boxShadow: "0 4px 12px rgba(255, 255, 255, 0.1)" }}
        >
          {checkinLogged ? "Update check-in" : "Morning Check-In"}
        </button>
      </section>

      {(() => {
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const todayWorkout = activePlanDaysWithExercises.find((d) => d.scheduledDate === todayKey);
        const showCheckinBanner = !checkinLogged;
        const showWorkoutBanner = !!todayWorkout && savedSetCount === 0;
        if (!showCheckinBanner && !showWorkoutBanner) return null;
        return (
          <section className="flex-col gap-sm">
            {showCheckinBanner && (
              <button
                type="button"
                onClick={() => setShowCheckinSheet(true)}
                className="glass-card flex-row items-center justify-between"
                style={{
                  marginBottom: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  borderLeft: "4px solid var(--status-yellow)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>Check-in not logged</span>
                <span style={{ fontSize: 13, color: "var(--accent-muted)" }}>Log now</span>
              </button>
            )}
            {showWorkoutBanner && (
              <button
                type="button"
                onClick={() => workoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="glass-card flex-row items-center justify-between"
                style={{
                  marginBottom: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  borderLeft: "4px solid var(--status-red)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>Workout waiting</span>
                <span style={{ fontSize: 13, color: "var(--accent-muted)" }}>Start session</span>
              </button>
            )}
          </section>
        );
      })()}

      {/* Workout Set Tracker Gym interface */}
      <section ref={workoutRef} className="glass-card flex-col gap-md">
        <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
          <div className="flex-row items-center gap-sm" style={{ color: "var(--accent-white)" }}>
            <Dumbbell size={18} />
            <span className="text-heading" style={{ fontSize: "16px" }}>Today&apos;s Workout</span>
          </div>
          
          {dropdownDays.length > 0 ? (
            <div style={{ position: "relative" }}>
              <select
                value={selectedDayId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedDayId(id);
                  const h = hydrateFromLogs(clientPlanDays.find((d) => d.id === id), todaySetLogs);
                  setCompletedSets(h.done);
                  setWorkoutWeights(h.weights);
                  setWorkoutReps(h.reps);
                }}
                style={{
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-frosted)",
                  color: "var(--accent-white)",
                  fontSize: "12px",
                  padding: "6px 28px 6px 12px",
                  borderRadius: "8px",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  backgroundSize: "12px",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {selectedDayId === "" && (
                  <option value="">Rest Day</option>
                )}
                {dropdownDays.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                {selectedDayId !== "" && (
                  <option value="">Rest Day</option>
                )}
              </select>
            </div>
          ) : null}
        </div>

        {dropdownDays.length === 0 ? (
          <div className="flex-col items-center justify-center text-center p-4" style={{ height: "150px" }}>
            <span style={{ color: "var(--accent-muted)", fontSize: "14px" }}>
              No workouts planned on your schedule.
            </span>
          </div>
        ) : !activeDay ? (
          <div 
            className="flex-col items-center justify-center text-center gap-sm"
            style={{ 
              padding: "32px 16px",
              border: "1px dashed var(--border-frosted)",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.01)"
            }}
          >
            <div 
              className="flex-row items-center justify-center"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                color: "var(--status-yellow)",
                marginBottom: "4px"
              }}
            >
              <Coffee size={22} />
            </div>
            <div className="flex-col gap-xxs">
              <span className="text-heading" style={{ fontSize: "16px", color: "var(--accent-white)" }}>
                Rest & Recovery
              </span>
              <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 500 }}>
                No workout scheduled for today.
              </span>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--accent-muted)", maxWidth: "280px", margin: "4px 0 0 0", lineHeight: 1.5 }}>
              Focus on proper nutrition, hydration, and active recovery to let your body rebuild and grow stronger.
            </p>
          </div>
        ) : (
          <div className="flex-col gap-md">
            {workoutSuccess && (
              <div 
                style={{
                  backgroundColor: "var(--status-green)",
                  color: "black",
                  padding: "12px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "13px",
                  textAlign: "center"
                }}
              >
                Workout sets saved successfully! Targets snapped.
              </div>
            )}

            {activeDay.exercises.map((ex) => (
              <div key={ex.id} className="flex-col gap-sm" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "16px" }}>
                <div className="flex-row items-start gap-sm">
                  <ExerciseGif gifUrl={ex.gifUrl} thumbnailUrl={ex.thumbnailUrl} name={ex.name} size={72} />
                  <div className="flex-col gap-xs" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: "16px", textTransform: "capitalize" }}>{ex.name}</span>
                    {ex.steps?.[0] && (
                      <span style={{ fontSize: "12px", color: "var(--accent-muted)", lineHeight: 1.4 }}>
                        {ex.steps[0]}
                      </span>
                    )}
                    {ex.coachingCue && (
                      <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontStyle: "italic" }}>
                        Coach: {ex.coachingCue}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)", whiteSpace: "nowrap" }}>
                    {ex.restSeconds}s rest
                  </span>
                </div>

                {/* Input Prefilled Table */}
                <div className="flex-col gap-xs">
                  {Array.from({ length: ex.sets }).map((_, sIdx) => {
                    const isDone = completedSets[ex.id]?.[sIdx] || false;
                    const numericWeight = typeof ex.weight === "string" ? parseFloat(ex.weight) || 0 : ex.weight ?? 0;
                    const weightVal = workoutWeights[ex.id]?.[sIdx] ?? (numericWeight > 0 ? numericWeight.toString() : "");
                    const repsVal = workoutReps[ex.id]?.[sIdx] ?? (ex.repsRange && ex.repsRange !== "—" && ex.repsRange !== "-" ? ex.repsRange.split("-")[0] : "");

                    return (
                      <div 
                        key={sIdx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "45px minmax(80px, 1fr) 75px 65px 36px",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          backgroundColor: isDone ? "rgba(16, 185, 129, 0.08)" : "transparent",
                          border: isDone ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                          transition: "all 0.15s ease-out"
                        }}
                      >
                        {/* Column 1: Set Number */}
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-muted)" }}>
                          SET {sIdx + 1}
                        </span>

                        {/* Column 2: Target */}
                        <div className="flex-row items-baseline gap-xxs" style={{ fontSize: "11px", color: "var(--accent-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ opacity: 0.6 }}>Target:</span>
                          <span style={{ fontWeight: 700, color: "var(--accent-white)" }}>
                            {numericWeight > 0 ? `${numericWeight}kg` : "—"}×{ex.repsRange || "—"}
                          </span>
                        </div>

                        {/* Column 3: Weight input */}
                        <div className="flex-row items-center gap-xs">
                          <input 
                            type="number"
                            step="0.5"
                            value={weightVal}
                            onChange={(e) => handleWeightChange(ex.id, sIdx, e.target.value)}
                            style={{
                              width: "52px",
                              height: "32px",
                              padding: "0 4px",
                              textAlign: "center",
                              fontSize: "13px",
                              backgroundColor: isDone ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.04)",
                              border: "1px solid var(--border-frosted)",
                              borderRadius: "8px",
                              color: isDone ? "var(--accent-muted)" : "var(--accent-white)",
                              fontWeight: "600",
                              outline: "none"
                            }}
                          />
                          <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>kg</span>
                        </div>

                        {/* Column 4: Reps input */}
                        <div className="flex-row items-center gap-xs">
                          <input 
                            type="number"
                            value={repsVal}
                            onChange={(e) => handleRepsChange(ex.id, sIdx, e.target.value)}
                            style={{
                              width: "38px",
                              height: "32px",
                              padding: "0 4px",
                              textAlign: "center",
                              fontSize: "13px",
                              backgroundColor: isDone ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.04)",
                              border: "1px solid var(--border-frosted)",
                              borderRadius: "8px",
                              color: isDone ? "var(--accent-muted)" : "var(--accent-white)",
                              fontWeight: "600",
                              outline: "none"
                            }}
                          />
                          <span style={{ fontSize: "11px", color: "var(--accent-muted)" }}>reps</span>
                        </div>

                        {/* Column 5: Done Checkbox */}
                        <button
                          onClick={() => handleSetToggle(ex.id, sIdx)}
                          className={`touch-action ${isDone ? "animate-check" : ""}`}
                          style={{
                            justifySelf: "end",
                            width: "32px",
                            height: "32px",
                            minWidth: "32px",
                            minHeight: "32px",
                            borderRadius: "50%",
                            border: isDone ? "none" : "2px solid var(--border-frosted)",
                            backgroundColor: isDone ? "var(--status-green)" : "transparent",
                            color: "var(--bg-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                            boxShadow: isDone ? "0 0 10px rgba(16, 185, 129, 0.3)" : "none"
                          }}
                        >
                          {isDone && <Check size={14} strokeWidth={3.5} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <span style={{ fontSize: 10, color: "var(--accent-muted)" }}>{EXERCISE_ATTRIBUTION}</span>
            <button
              onClick={handleWorkoutSubmit}
              disabled={workoutLogging}
              className="btn-primary w-full mt-md flex-row items-center justify-center gap-sm"
              style={{ height: "48px", fontSize: "14px" }}
            >
              <ClipboardCheck size={18} />
              {workoutLogging ? "Saving…" : "Save ticked sets"}
            </button>
          </div>
        )}
      </section>

      {/* Premium Calorie & Macro Dashboard Grid */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px"
        }}
      >
        {/* Card 1: Calorie & Macro Dashboard */}
        <div className="glass-card flex-col gap-md" style={{ padding: "20px", marginBottom: 0 }}>
          <div className="flex-row justify-between items-center">
            <div className="flex-row items-center gap-sm" style={{ color: "var(--accent-white)" }}>
              <Flame size={16} style={{ opacity: 0.8 }} />
              <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em" }}>
                NUTRITION & MACROS
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--status-green)", fontWeight: 700 }}>
              {calPct}% COMPLETED
            </span>
          </div>

          <div className="flex-row items-baseline gap-xs">
            <span style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
              {currentCalories}
            </span>
            <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
              / {calorieTargetVal} kcal
            </span>
          </div>

          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                background: "linear-gradient(90deg, var(--accent-white), rgba(255,255,255,0.7))",
                width: `${Math.min(100, (currentCalories / calorieTargetVal) * 100)}%`,
                transition: "width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)"
              }} 
            />
          </div>

          {/* Macro Budgets row */}
          <div className="flex-col gap-sm" style={{ marginTop: "4px" }}>
            {/* Protein */}
            <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
              <div className="flex-row justify-between items-center">
                <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Protein Goal</span>
                <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                  {Math.round((currentProtein / proteinTargetVal) * 100) || 0}% Completed
                </span>
              </div>
              <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
                <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{currentProtein}g</span>
                <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {proteinTargetVal}g</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #6366f1, #818cf8)",
                    width: `${Math.min(100, (currentProtein / proteinTargetVal) * 100)}%`,
                    transition: "width 0.4s ease-out"
                  }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
              <div className="flex-row justify-between items-center">
                <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Carbohydrates Goal</span>
                <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                  {Math.round((currentCarbs / carbsTargetVal) * 100) || 0}% Completed
                </span>
              </div>
              <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
                <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{currentCarbs}g</span>
                <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {carbsTargetVal}g</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                    width: `${Math.min(100, (currentCarbs / carbsTargetVal) * 100)}%`,
                    transition: "width 0.4s ease-out"
                  }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="flex-col gap-xs" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-frosted)" }}>
              <div className="flex-row justify-between items-center">
                <span style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 600 }}>Daily Fats Goal</span>
                <span style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 600 }}>
                  {Math.round((currentFats / fatsTargetVal) * 100) || 0}% Completed
                </span>
              </div>
              <div className="flex-row items-baseline gap-xxs" style={{ margin: "4px 0" }}>
                <span style={{ color: "var(--accent-white)", fontSize: "20px", fontWeight: 800 }}>{currentFats}g</span>
                <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>/ {fatsTargetVal}g</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #fb7185, #f43f5e)",
                    width: `${Math.min(100, (currentFats / fatsTargetVal) * 100)}%`,
                    transition: "width 0.4s ease-out"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Daily Steps Card */}
        <div className="glass-card flex-col gap-sm" style={{ padding: "20px", marginBottom: 0 }}>
          <div className="flex-row justify-between items-center">
            <div className="flex-row items-center gap-sm" style={{ color: "var(--accent-white)" }}>
              <Award size={16} style={{ opacity: 0.8 }} />
              <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em" }}>
                DAILY STEPS
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--status-green)", fontWeight: 700 }}>
              {stepsPct}% MET
            </span>
          </div>

          <div className="flex-row items-baseline gap-xs">
            <span style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
              {parseInt(loggedSteps).toLocaleString()}
            </span>
            <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
              / {client.stepTarget.toLocaleString()} steps
            </span>
          </div>

          <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                background: "linear-gradient(90deg, var(--status-green), #34d399)", 
                width: `${Math.min(100, (parseInt(loggedSteps) / client.stepTarget) * 100)}%`,
                transition: "width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)"
              }} 
            />
          </div>

          {/* Quick steps adjustment inline */}
          <div className="flex-row items-center gap-sm" style={{ borderTop: "1px solid var(--border-frosted)", paddingTop: "12px", marginTop: "4px" }}>
            <input 
              type="number" 
              value={loggedSteps}
              onChange={(e) => {
                setLoggedSteps(e.target.value);
                setStepsSuccess(false);
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-frosted)",
                borderRadius: "10px",
                color: "var(--accent-white)",
                fontSize: "14px",
                fontWeight: 600,
                padding: "0 12px",
                height: "40px",
                width: "100%",
                outline: "none"
              }}
            />
            <button
              onClick={async () => {
                const stepsVal = parseInt(loggedSteps) || 0;
                const res = await saveDailySteps(stepsVal);
                if (res.success) {
                  setStepsSuccess(true);
                  setTimeout(() => setStepsSuccess(false), 2000);
                }
              }}
              className="btn-secondary"
              style={{ 
                height: "40px", 
                borderRadius: "10px", 
                padding: "0 16px", 
                fontSize: "13px", 
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {stepsSuccess ? "Steps Saved!" : "Confirm Steps"}
            </button>
          </div>
        </div>
      </div>

      {/* Today's Logged Meals */}
      <section className="glass-card flex-col gap-sm" style={{ padding: "20px" }}>
        <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px", marginBottom: "4px" }}>
          <div className="flex-row items-center gap-sm">
            <Utensils size={15} color="var(--accent-white)" style={{ opacity: 0.8 }} />
            <span className="text-heading" style={{ fontSize: "14px", fontWeight: 700 }}>
              Today&apos;s Logged Meals
            </span>
          </div>
          <Link href="/client/meals" style={{ fontSize: "12px", color: "var(--accent-white)", textDecoration: "underline", fontWeight: 600 }}>
            + Log Meal
          </Link>
        </div>

        {todayMealLogs.length === 0 ? (
          <div 
            className="flex-col items-center justify-center text-center p-sm gap-xs" 
            style={{ 
              minHeight: "100px", 
              border: "1px dashed var(--border-frosted)", 
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.01)" 
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--accent-muted)" }}>No meals logged today.</span>
            <Link href="/client/meals" className="btn-secondary flex-row items-center justify-center" style={{ fontSize: "11px", padding: "4px 12px", height: "28px", width: "fit-content" }}>
              Go Log a Meal
            </Link>
          </div>
        ) : (
          <div className="flex-col gap-sm">
            {todayMealLogs.map((log: MealLogData) => (
              <div 
                key={log.id}
                className="flex-row items-center justify-between"
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--border-frosted)",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255, 255, 255, 0.01)"
                }}
              >
                <div className="flex-row items-center gap-sm">
                  {log.imageUrl ? (
                    <div 
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundImage: `url(${log.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid var(--border-frosted)"
                      }}
                    />
                  ) : (
                    <div 
                      className="flex-row items-center justify-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-frosted)",
                        color: "var(--accent-muted)"
                      }}
                    >
                      <Utensils size={14} style={{ opacity: 0.5 }} />
                    </div>
                  )}
                  <div className="flex-col">
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-white)" }}>
                      {log.name}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "var(--accent-muted)" }}>
                      P: {log.protein}g • C: {log.carbs}g • F: {log.fats}g
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-white)" }}>
                  +{log.calories} kcal
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error Toast */}
      {errorMessage && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--status-red)",
          color: "white",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          zIndex: 1000,
          maxWidth: "90%",
          textAlign: "center",
        }}>
          {errorMessage}
          <button 
            onClick={() => setErrorMessage(null)} 
            style={{ 
              marginLeft: "1rem", 
              background: "none", 
              border: "none", 
              color: "white", 
              cursor: "pointer",
              fontSize: "16px",
            }}
          >×</button>
        </div>
      )}

      {/* Morning Check-In Sliding Bottom Sheet Drawer */}
      {showCheckinSheet && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end"
          }}
          onClick={() => setShowCheckinSheet(false)}
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
              maxHeight: "85vh",
              overflowY: "auto",
              animation: "slideUp 0.3s ease-out",
              color: "var(--accent-white)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-row justify-between items-center" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "12px" }}>
              <span className="text-heading" style={{ fontSize: "18px" }}>Daily Check-In Metrics</span>
              <button 
                onClick={() => setShowCheckinSheet(false)}
                className="touch-action"
                style={{ background: "none", border: "none", color: "var(--accent-white)" }}
              >
                Cancel
              </button>
            </div>

            {checkinSuccess && (
              <div 
                style={{
                  backgroundColor: "var(--status-green)",
                  color: "black",
                  padding: "12px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "13px",
                  textAlign: "center"
                }}
              >
                Daily Check-In saved to database!
              </div>
            )}

            <form onSubmit={handleCheckinSubmit} className="flex-col gap-md">
              {/* Weight Log Control */}
              <div className="flex-col gap-sm">
                <div className="flex-row justify-between items-center">
                  <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>BODY WEIGHT (KG)</label>
                  <span style={{ fontSize: "18px", fontWeight: 800 }}>{weight} kg</span>
                </div>
                <input 
                  type="range" 
                  min="40.0" 
                  max="150.0" 
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--accent-white)" }}
                />
              </div>

              {/* Sleep log buttons */}
              <div className="flex-col gap-sm">
                <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>SLEEP DURATION (HOURS)</label>
                <div 
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(5, 1fr)", 
                    gap: "8px" 
                  }}
                >
                  {["5", "6", "7", "8", "9+"].map((h) => {
                    const isSelected = sleep === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSleep(h)}
                        className="touch-action"
                        style={{
                          height: "44px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid var(--accent-white)" : "1px solid var(--border-frosted)",
                          backgroundColor: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                          color: isSelected ? "var(--accent-white)" : "var(--accent-muted)",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Energy levels */}
              <div className="flex-col gap-sm">
                <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>ENERGY & RECOVERY (1-10)</label>
                <div 
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(5, 1fr)", 
                    gap: "8px" 
                  }}
                >
                  {["2", "4", "6", "8", "10"].map((lvl) => {
                    const isSelected = energy === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEnergy(lvl)}
                        className="touch-action"
                        style={{
                          height: "44px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid var(--accent-white)" : "1px solid var(--border-frosted)",
                          backgroundColor: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                          color: isSelected ? "var(--accent-white)" : "var(--accent-muted)",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diet adherence */}
              <div 
                onClick={() => setDietAdherence(!dietAdherence)}
                className="flex-row items-center justify-between cursor-pointer"
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-frosted)",
                  backgroundColor: "rgba(255, 255, 255, 0.01)"
                }}
              >
                <div className="flex-col gap-xs">
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>Diet Compliance</span>
                  <span style={{ fontSize: "12px", color: "var(--accent-muted)" }}>Met targeted nutrition targets today</span>
                </div>
                <div 
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    border: "2px solid var(--border-frosted)",
                    backgroundColor: dietAdherence ? "var(--status-green)" : "transparent",
                    borderColor: dietAdherence ? "var(--status-green)" : "var(--border-frosted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--bg-primary)"
                  }}
                >
                  {dietAdherence && <Check size={16} strokeWidth={3} />}
                </div>
              </div>

              {/* Checkin notes */}
              <div className="flex-col gap-sm">
                <label style={{ fontSize: "11px", color: "var(--accent-muted)", fontWeight: 700 }}>DAILY NOTES</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Muscle soreness, joints feeling stiff, hunger levels, etc..."
                  rows={3}
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-frosted)",
                    color: "var(--accent-white)",
                    padding: "12px",
                    borderRadius: "12px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={checkinLogging}
                className="btn-primary w-full mt-md"
                style={{ height: "48px", fontSize: "14px", fontWeight: 700 }}
              >
                {checkinLogging ? "Saving Check-In..." : "SUBMIT DAILY CHECK-IN"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
