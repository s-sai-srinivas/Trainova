import prisma from "@/lib/db";
import { saveBase64File } from "@/lib/utils/upload";
import { catalogGifUrl, getCatalogById } from "@/lib/exerciseCatalog";

async function verifyExerciseOwnership(exerciseId: string, trainerId: string) {
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) throw new Error("Exercise not found.");
  if (exercise.trainerId !== trainerId) throw new Error("Unauthorized: exercise does not belong to this trainer.");
  return exercise;
}

export async function duplicateExercise(trainerId: string, exerciseId: string) {
  try {
    const exercise = await verifyExerciseOwnership(exerciseId, trainerId);

    const clone = await prisma.exercise.create({
      data: {
        trainerId: trainerId,
        name: `${exercise.name} (Copy)`,
        instructions: exercise.instructions,
        coachingNotes: exercise.coachingNotes,
        muscleGroup: exercise.muscleGroup,
        equipmentType: exercise.equipmentType,
        difficulty: exercise.difficulty,
        videoMain: exercise.videoMain,
        videoSide: exercise.videoSide,
        videoMistakes: exercise.videoMistakes,
        tags: exercise.tags,
        archived: false,
      },
    });

    return { success: true, exerciseId: clone.id };
  } catch (error) {
    console.error("Failed to duplicate exercise:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to duplicate exercise." };
  }
}

export async function archiveExercise(trainerId: string, exerciseId: string, archiveState: boolean) {
  try {
    await verifyExerciseOwnership(exerciseId, trainerId);
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: { archived: archiveState },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to archive exercise:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive exercise." };
  }
}

export async function uploadExerciseVideo(
  trainerId: string,
  exerciseId: string,
  type: "main" | "side" | "mistakes",
  fileName: string,
  base64Data: string
) {
  try {
    await verifyExerciseOwnership(exerciseId, trainerId);

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    const res = await saveBase64File({
      base64Str: base64Data,
      allowedMimeTypes: ALLOWED_TYPES,
      fileNamePrefix: `${exerciseId}_${type}`,
      originalFileName: fileName,
    });

    if (!res.success || !res.url) {
      return { success: false, error: res.error || "Failed to upload video." };
    }

    const relativeUrl = res.url;

    const updateData: Record<string, string> = {};
    if (type === "main") updateData.videoMain = relativeUrl;
    else if (type === "side") updateData.videoSide = relativeUrl;
    else if (type === "mistakes") updateData.videoMistakes = relativeUrl;

    await prisma.exercise.update({
      where: { id: exerciseId },
      data: updateData,
    });

    return { success: true, url: relativeUrl };
  } catch (error) {
    console.error("Failed to upload video:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to write upload files to disk storage." };
  }
}

export async function createExercise(trainerId: string, data: {
  name: string;
  muscleGroup: string;
  equipmentType: string;
  instructions: string;
  coachingNotes?: string;
  difficulty?: string;
}) {
  try {
    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { id: trainerId } });
    if (!trainerProfile) return { success: false, error: "Trainer profile not found." };

    const newEx = await prisma.exercise.create({
      data: {
        trainerId: trainerId,
        name: data.name,
        muscleGroup: data.muscleGroup || "Other",
        equipmentType: data.equipmentType || "None",
        instructions: data.instructions || "Perform movement under control.",
        coachingNotes: data.coachingNotes || "",
        difficulty: data.difficulty || "Intermediate",
      },
    });

    return { success: true, exercise: newEx };
  } catch (error) {
    console.error("Failed to create exercise:", error);
    return { success: false, error: "Failed to create exercise." };
  }
}

export async function getOrCreateCustomExercise(trainerId: string, name: string) {
  try {
    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { id: trainerId } });
    if (!trainerProfile) return { success: false, error: "Trainer profile not found." };

    let exercise = await prisma.exercise.findFirst({
      where: {
        trainerId: trainerId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (!exercise) {
      exercise = await prisma.exercise.create({
        data: {
          trainerId: trainerId,
          name: name,
          muscleGroup: "Other",
          equipmentType: "Other",
          instructions: "Custom trainer-added exercise.",
          difficulty: "Intermediate",
        },
      });
    }

    return { success: true, exercise };
  } catch (error) {
    console.error("Failed to get or create custom exercise:", error);
    return { success: false, error: "Failed to resolve exercise." };
  }
}

export async function ensureCatalogExercise(trainerId: string, catalogId: string) {
  const existing = await prisma.exercise.findUnique({
    where: { trainerId_catalogId: { trainerId, catalogId } },
  });
  if (existing) return { success: true as const, exercise: existing };

  const cat = getCatalogById(catalogId);
  if (!cat) return { success: false as const, error: "Exercise not found in catalog." };

  const exercise = await prisma.exercise.create({
    data: {
      trainerId,
      catalogId,
      name: cat.name,
      muscleGroup: cat.category,
      equipmentType: cat.equipment,
      instructions: cat.steps.join(" ") || "Perform movement under control.",
      coachingNotes: cat.target ? `Target: ${cat.target}` : "",
      difficulty: "Intermediate",
      gifUrl: catalogGifUrl(cat.gif),
      thumbnailUrl: catalogGifUrl(cat.thumb),
    },
  });
  return { success: true as const, exercise };
}

export async function resolvePlannedExerciseIds(
  trainerId: string,
  items: { exerciseId?: string; catalogId?: string | null }[]
) {
  const resolved: string[] = [];
  for (const item of items) {
    if (item.catalogId) {
      const res = await ensureCatalogExercise(trainerId, item.catalogId);
      if (!res.success) return res;
      resolved.push(res.exercise.id);
      continue;
    }
    if (item.exerciseId && !item.exerciseId.startsWith("catalog:")) {
      resolved.push(item.exerciseId);
      continue;
    }
    if (item.exerciseId?.startsWith("catalog:")) {
      const res = await ensureCatalogExercise(trainerId, item.exerciseId.slice("catalog:".length));
      if (!res.success) return res;
      resolved.push(res.exercise.id);
      continue;
    }
    return { success: false as const, error: "Each movement needs a catalog or library exercise." };
  }
  return { success: true as const, exerciseIds: resolved };
}

export async function updateExerciseNotes(
  trainerId: string,
  exerciseId: string,
  coachingNotes: string
) {
  try {
    await verifyExerciseOwnership(exerciseId, trainerId);

    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: { coachingNotes },
    });

    return { success: true, exercise: updated };
  } catch (error) {
    console.error("Failed to update exercise notes:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update exercise notes." };
  }
}
