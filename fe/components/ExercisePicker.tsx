"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CATALOG_CATEGORIES,
  CatalogExercise,
  catalogGifUrl,
  searchCatalog,
  EXERCISE_ATTRIBUTION,
} from "@/lib/exerciseCatalog";
import ExerciseGif from "@/components/ExerciseGif";

const CATEGORY_LABEL: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  "upper arms": "Arms",
  "lower arms": "Forearms",
  "upper legs": "Legs",
  "lower legs": "Calves",
  waist: "Core",
  cardio: "Cardio",
  neck: "Neck",
};

interface ExercisePickerProps {
  onPick: (exercise: CatalogExercise) => void;
}

export default function ExercisePicker({ onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const results = useMemo(
    () => searchCatalog(query, category, "ALL", query.trim().length >= 2 || category !== "ALL" ? 48 : 18),
    [query, category]
  );
  const showGrid = query.trim().length >= 1 || category !== "ALL";

  return (
    <section className="flex-col gap-sm">
      <label style={{ fontSize: "12px", color: "var(--accent-muted)", fontWeight: 700, letterSpacing: "0.06em" }}>
        ADD FROM 1,324 MOVEMENTS
      </label>
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent-muted)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bench, squat, curl…"
          autoComplete="off"
          style={{ paddingLeft: 40, height: 48 }}
        />
      </div>

      <div className="flex-row" style={{ gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setCategory("ALL")}
          className={category === "ALL" ? "btn-primary" : "btn-secondary"}
          style={{ height: 36, padding: "0 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          All
        </button>
        {CATALOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={category === cat ? "btn-primary" : "btn-secondary"}
            style={{ height: 36, padding: "0 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {CATEGORY_LABEL[cat] || cat}
          </button>
        ))}
      </div>

      {showGrid ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 8,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", color: "var(--accent-muted)" }}>
              No matches. Try a muscle or equipment name.
            </div>
          ) : (
            results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex)}
                className="glass-card flex-row items-center gap-sm"
                style={{
                  marginBottom: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  minHeight: 72,
                  padding: 10,
                }}
              >
                <ExerciseGif
                  gifUrl={catalogGifUrl(ex.gif)}
                  thumbnailUrl={catalogGifUrl(ex.thumb)}
                  name={ex.name}
                  size={56}
                />
                <div className="flex-col" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize" }}>{ex.name}</span>
                  <span style={{ fontSize: 12, color: "var(--accent-muted)", textTransform: "capitalize" }}>
                    {ex.category} · {ex.equipment} · {ex.target}
                  </span>
                </div>
                <span style={{ color: "var(--status-green)", fontWeight: 800, fontSize: 12 }}>ADD</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--accent-muted)", lineHeight: 1.5 }}>
          Type a name or tap a body part. Animations © Gym visual.
        </p>
      )}
      <span style={{ fontSize: 10, color: "var(--accent-muted)" }}>{EXERCISE_ATTRIBUTION}</span>
    </section>
  );
}
