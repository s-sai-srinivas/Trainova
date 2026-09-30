"use client";

import { useState } from "react";
import { EXERCISE_ATTRIBUTION } from "@/lib/exerciseCatalog";

interface ExerciseGifProps {
  gifUrl?: string | null;
  thumbnailUrl?: string | null;
  name: string;
  size?: number;
  play?: boolean;
}

export default function ExerciseGif({
  gifUrl,
  thumbnailUrl,
  name,
  size = 56,
  play = true,
}: ExerciseGifProps) {
  const [failed, setFailed] = useState(false);
  const src = play ? gifUrl || thumbnailUrl : thumbnailUrl || gifUrl;

  if (!src || failed) {
    return (
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border-frosted)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={`${name} form`}
      width={size}
      height={size}
      loading="lazy"
      title={EXERCISE_ATTRIBUTION}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 10,
        background: "#111",
        border: "1px solid var(--border-frosted)",
        flexShrink: 0,
      }}
    />
  );
}
