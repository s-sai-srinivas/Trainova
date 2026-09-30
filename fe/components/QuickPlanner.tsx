"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, AlertCircle, CheckCircle2, Copy, CalendarRange } from "lucide-react";
import { planExercisesForDay } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";
import { PlanDay, PlannedExercise } from "@/lib/types";
import { CatalogExercise, catalogGifUrl } from "@/lib/exerciseCatalog";
import ExercisePicker from "@/components/ExercisePicker";
import ExerciseGif from "@/components/ExerciseGif";

interface QuickPlannerProps {
  client: { id: string; name: string };
  initialPlanDays: PlanDay[];
  workoutLogs: {
    date: string;
    exercises: { exerciseName: string; setNumber: number; weight: number; reps: number }[];
  }[];
  hideHeader?: boolean;
}

function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return formatLocal(d);
}

function formatLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocal(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function weekdaysMonFri(dateStr: string) {
  const d = parseLocal(dateStr);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return [0, 1, 2, 3, 4].map((i) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    return formatLocal(next);
  });
}

function cloneExercises(list: PlannedExercise[]) {
  return list.map((ex) => ({
    ...ex,
    id: `temp-${ex.catalogId || ex.exerciseId}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

export default function QuickPlanner({
  client,
  initialPlanDays,
  workoutLogs,
  hideHeader = false,
}: QuickPlannerProps) {
  const todayStr = localDate(0);
  const tomorrowStr = localDate(1);
  const [mode, setMode] = useState<"today" | "tomorrow" | "pick">("tomorrow");
  const [customDate, setCustomDate] = useState(tomorrowStr);
  const [localDays, setLocalDays] = useState<PlanDay[]>(initialPlanDays);
  const [planned, setPlanned] = useState<PlannedExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDate = mode === "today" ? todayStr : mode === "tomorrow" ? tomorrowStr : customDate;

  const [prevDate, setPrevDate] = useState(activeDate);
  if (activeDate !== prevDate) {
    setPrevDate(activeDate);
    const day = localDays.find((d) => d.scheduledDate === activeDate);
    setPlanned(day?.exercises ?? []);
  }

  const persist = async (next: PlannedExercise[], isAuto = false, dateStr = activeDate) => {
    if (!isAuto) setSaving(true);
    const payload = next.map((ex) => ({
      exerciseId: ex.exerciseId.startsWith("catalog:") ? undefined : ex.exerciseId,
      catalogId: ex.catalogId || (ex.exerciseId.startsWith("catalog:") ? ex.exerciseId.slice(8) : null),
      sets: ex.sets,
      repsRange: ex.repsRange || "8-10",
      targetWeight: typeof ex.weight === "string" ? parseFloat(ex.weight) || 0 : ex.weight ?? 0,
      coachingNote: ex.coachingNote || null,
    }));
    const res = await planExercisesForDay(client.id, dateStr, payload);
    if (res.success) {
      setLocalDays((prev) => {
        const others = prev.filter((d) => d.scheduledDate !== dateStr);
        return [
          ...others,
          {
            id: res.workoutDayId || `day-${dateStr}`,
            name: `${dateStr} workout`,
            dayNumber: 0,
            scheduledDate: dateStr,
            exercises: next,
          },
        ];
      });
      if (!isAuto) {
        setStatus({ ok: true, text: "Assigned to athlete" });
        setTimeout(() => setStatus(null), 2500);
      }
      if (!isAuto) setSaving(false);
      return true;
    }
    if (!isAuto) {
      setStatus({ ok: false, text: res.error || "Save failed" });
      setSaving(false);
    }
    return false;
  };

  const queueSave = (next: PlannedExercise[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next, true), APP_CONFIG.AUTO_SAVE_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const addFromCatalog = (cat: CatalogExercise) => {
    const already = planned.some((ex) => ex.catalogId === cat.id);
    if (already) {
      setStatus({ ok: false, text: "Already on this day" });
      setTimeout(() => setStatus(null), 1500);
      return;
    }
    const next: PlannedExercise[] = [
      ...planned,
      {
        id: `temp-${cat.id}-${Date.now()}`,
        exerciseId: `catalog:${cat.id}`,
        catalogId: cat.id,
        name: cat.name,
        sets: 3,
        repsRange: "8-10",
        weight: 0,
        coachingNote: "",
        gifUrl: catalogGifUrl(cat.gif),
        thumbnailUrl: catalogGifUrl(cat.thumb),
        steps: cat.steps,
      },
    ];
    setPlanned(next);
    queueSave(next);
  };

  const update = (id: string, patch: Partial<PlannedExercise>) => {
    const next = planned.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex));
    setPlanned(next);
    queueSave(next);
  };

  const remove = (id: string) => {
    const next = planned.filter((ex) => ex.id !== id);
    setPlanned(next);
    queueSave(next);
  };

  const sourceForCopy = () => {
    if (planned.length > 0) return planned;
    const previous = [...localDays]
      .filter((d) => d.scheduledDate && d.exercises.length > 0 && d.scheduledDate !== activeDate)
      .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));
    return previous[0]?.exercises ?? [];
  };

  const repeatLast = async () => {
    const previous = [...localDays]
      .filter((d) => d.scheduledDate && d.exercises.length > 0 && d.scheduledDate !== activeDate)
      .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));
    const src = previous[0]?.exercises ?? [];
    if (src.length === 0) {
      setStatus({ ok: false, text: "No earlier workout to copy" });
      return;
    }
    const next = cloneExercises(src);
    setPlanned(next);
    await persist(next, false);
    setStatus({ ok: true, text: `Copied ${previous[0].scheduledDate}` });
  };

  const applyWeek = async () => {
    const src = sourceForCopy();
    if (src.length === 0) {
      setStatus({ ok: false, text: "Add movements first, or copy last workout" });
      return;
    }
    setSaving(true);
    const dates = weekdaysMonFri(activeDate);
    const cloned = cloneExercises(src);
    setPlanned(cloned);
    let failed = false;
    for (const dateStr of dates) {
      const ok = await persist(cloned, true, dateStr);
      if (ok === false) failed = true;
    }
    setSaving(false);
    setStatus({
      ok: !failed,
      text: failed ? "Some weekdays failed to save" : `Applied to Mon–Fri (${dates[0]}–${dates[4]})`,
    });
  };

  const lastLog = (name: string) => {
    for (const log of workoutLogs) {
      const sets = log.exercises.filter((e) => e.exerciseName.toLowerCase() === name.toLowerCase());
      if (sets.length) return { date: log.date, sets };
    }
    return null;
  };

  return (
    <div className="flex-col gap-md" style={{ paddingBottom: 24 }}>
      {!hideHeader && (
        <header className="flex-row items-center justify-between">
          <Link
            href={`/trainer/clients/${client.id}`}
            className="flex-row items-center gap-xs"
            style={{ color: "var(--accent-muted)", textDecoration: "none", fontSize: 14, minHeight: 44 }}
          >
            <ArrowLeft size={16} /> {client.name}
          </Link>
          {status && (
            <span
              className="flex-row items-center gap-xs"
              style={{ fontSize: 13, fontWeight: 700, color: status.ok ? "var(--status-green)" : "var(--status-red)" }}
            >
              {status.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {status.text}
            </span>
          )}
        </header>
      )}

      <section className="glass-card flex-col gap-sm">
        <h1 className="text-heading" style={{ fontSize: 20, margin: 0 }}>
          Assign workout
        </h1>
        <div className="flex-row gap-sm">
          {(["today", "tomorrow", "pick"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={mode === id ? "btn-primary" : "btn-secondary"}
              style={{ flex: 1, height: 44, fontSize: 13 }}
            >
              {id === "today" ? "Today" : id === "tomorrow" ? "Tomorrow" : "Pick date"}
            </button>
          ))}
        </div>
        {mode === "pick" && (
          <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        )}
        <span style={{ fontSize: 13, color: "var(--accent-muted)" }}>
          {client.name} · {activeDate}
        </span>
        <div className="flex-row gap-sm">
          <button
            type="button"
            onClick={repeatLast}
            className="btn-secondary flex-row items-center justify-center gap-xs"
            style={{ flex: 1, height: 44, fontSize: 13 }}
          >
            <Copy size={14} /> Repeat last
          </button>
          <button
            type="button"
            onClick={applyWeek}
            disabled={saving}
            className="btn-secondary flex-row items-center justify-center gap-xs"
            style={{ flex: 1, height: 44, fontSize: 13 }}
          >
            <CalendarRange size={14} /> Apply Mon–Fri
          </button>
        </div>
      </section>

      <ExercisePicker onPick={addFromCatalog} />

      <section className="flex-col gap-sm">
        <h2 className="text-heading" style={{ fontSize: 14, color: "var(--accent-muted)" }}>
          {planned.length} movement{planned.length === 1 ? "" : "s"}
        </h2>
        {planned.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", color: "var(--accent-muted)" }}>
            Search above and tap ADD. The athlete sees the same animation on Today.
          </div>
        ) : (
          planned.map((ex) => {
            const prev = lastLog(ex.name);
            return (
              <article key={ex.id} className="glass-card flex-col gap-sm" style={{ marginBottom: 0 }}>
                <div className="flex-row items-start gap-sm">
                  <ExerciseGif gifUrl={ex.gifUrl} thumbnailUrl={ex.thumbnailUrl} name={ex.name} size={64} />
                  <div className="flex-col" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 16, textTransform: "capitalize" }}>{ex.name}</strong>
                    {ex.steps?.[0] && (
                      <span style={{ fontSize: 12, color: "var(--accent-muted)", lineHeight: 1.4 }}>
                        {ex.steps[0]}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(ex.id)}
                    className="touch-action"
                    aria-label={`Remove ${ex.name}`}
                    style={{ background: "none", border: "none", color: "var(--status-red)" }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex-row gap-sm" style={{ flexWrap: "wrap" }}>
                  <label className="flex-col gap-xs" style={{ flex: 1, minWidth: 90 }}>
                    <span style={{ fontSize: 11, color: "var(--accent-muted)", fontWeight: 700 }}>SETS</span>
                    <div className="flex-row items-center gap-xs">
                      <button type="button" className="btn-secondary touch-action" onClick={() => update(ex.id, { sets: Math.max(1, ex.sets - 1) })}>−</button>
                      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{ex.sets}</span>
                      <button type="button" className="btn-primary touch-action" onClick={() => update(ex.id, { sets: ex.sets + 1 })}>+</button>
                    </div>
                  </label>
                  <label className="flex-col gap-xs" style={{ flex: 1, minWidth: 100 }}>
                    <span style={{ fontSize: 11, color: "var(--accent-muted)", fontWeight: 700 }}>REPS</span>
                    <input
                      value={ex.repsRange === "—" ? "" : ex.repsRange || ""}
                      onChange={(e) => update(ex.id, { repsRange: e.target.value })}
                      placeholder="8-10"
                      style={{ height: 44 }}
                    />
                  </label>
                  <label className="flex-col gap-xs" style={{ flex: 1, minWidth: 100 }}>
                    <span style={{ fontSize: 11, color: "var(--accent-muted)", fontWeight: 700 }}>KG</span>
                    <input
                      inputMode="decimal"
                      value={ex.weight === 0 ? "" : ex.weight ?? ""}
                      onChange={(e) => update(ex.id, { weight: e.target.value })}
                      placeholder="optional"
                      style={{ height: 44 }}
                    />
                  </label>
                </div>

                {prev && (
                  <span style={{ fontSize: 12, color: "var(--accent-muted)" }}>
                    Last: {prev.sets.map((s) => `${s.weight}×${s.reps}`).join(" · ")}
                  </span>
                )}
              </article>
            );
          })
        )}
      </section>

      <button
        type="button"
        onClick={() => persist(planned, false)}
        disabled={saving || planned.length === 0}
        className="btn-primary w-full flex-row items-center justify-center gap-sm"
        style={{ height: 52 }}
      >
        <Save size={18} />
        {saving ? "Saving…" : "Save for athlete"}
      </button>
    </div>
  );
}
