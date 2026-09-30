import { resolveCatalogMedia } from "@/lib/exerciseCatalog";
import { PlannedExercise } from "@/lib/types";

type ExerciseRow = {
  catalogId?: string | null;
  name: string;
  gifUrl?: string | null;
  thumbnailUrl?: string | null;
  instructions?: string | null;
  coachingNotes?: string | null;
};

export function mapPlannedExercise(
  row: {
    id: string;
    exerciseId: string;
    sets: number;
    repsRange: string;
    targetWeight: number;
    restSeconds: number;
    coachingNote?: string | null;
    supersetLabel?: string | null;
    exercise: ExerciseRow;
  }
): PlannedExercise {
  const media = resolveCatalogMedia(
    row.exercise.name,
    row.exercise.catalogId,
    row.exercise.gifUrl,
    row.exercise.thumbnailUrl
  );
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    catalogId: media.catalogId,
    name: row.exercise.name,
    sets: row.sets,
    repsRange: row.repsRange,
    weight: row.targetWeight,
    restSeconds: row.restSeconds,
    coachingNote: row.coachingNote ?? "",
    coachingCue: row.coachingNote ?? row.exercise.coachingNotes ?? "",
    supersetLabel: row.supersetLabel ?? "",
    gifUrl: media.gifUrl,
    thumbnailUrl: media.thumbnailUrl,
    steps: media.steps,
  };
}
