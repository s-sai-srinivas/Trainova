"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import * as authService from "@/lib/services/authService";
import * as clientService from "@/lib/services/clientService";
import * as planService from "@/lib/services/planService";
import * as exerciseService from "@/lib/services/exerciseService";
import * as workoutService from "@/lib/services/workoutService";
import * as trainerService from "@/lib/services/trainerService";
import { requireTrainer, requireClient } from "@/lib/auth";

export async function updateClientTargets(
  clientId: string,
  calories: number,
  steps: number,
  protein?: number,
  carbs?: number,
  fats?: number
) {
  const trainer = await requireTrainer();
  const res = await clientService.updateClientTargets(trainer.trainerProfileId, clientId, calories, steps, protein, carbs, fats);
  if (res.success) {
    revalidatePath("/trainer/dashboard");
    revalidatePath(`/trainer/clients/${clientId}`);
    revalidatePath("/client/today");
    revalidatePath("/client/meals");
  }
  return res;
}

export async function resolveAlert(clientId: string, message: string, triggerKey: string) {
  const trainer = await requireTrainer();
  const res = await clientService.resolveAlert(trainer.trainerProfileId, clientId, message, triggerKey);
  if (res.success) {
    revalidatePath("/trainer/dashboard");
  }
  return res;
}

export async function createNewPlan(name: string, description: string) {
  const trainer = await requireTrainer();
  const res = await planService.createNewPlan(trainer.trainerProfileId, name, description);
  if (res.success) {
    revalidatePath("/trainer/plans");
  }
  return res;
}

export async function assignPlanToClient(clientId: string, planId: string) {
  const trainer = await requireTrainer();
  const res = await planService.assignPlanToClient(trainer.trainerProfileId, clientId, planId);
  if (res.success) {
    revalidatePath(`/trainer/clients/${clientId}`);
    revalidatePath("/trainer/dashboard");
    revalidatePath("/client/today");
  }
  return res;
}

export async function saveClientCustomPlan(
  clientId: string,
  planDayId: string,
  exercises: { exerciseId?: string; catalogId?: string | null; sets: number; repsRange: string; restSeconds: number; targetWeight?: number }[]
) {
  const trainer = await requireTrainer();
  const res = await planService.saveClientCustomPlan(trainer.trainerProfileId, clientId, planDayId, exercises);
  if (res.success) {
    revalidatePath(`/trainer/clients/${clientId}`);
    revalidatePath("/trainer/dashboard");
    revalidatePath("/client/today");
  }
  return res;
}

export async function saveMasterPlanDay(
  planDayId: string,
  exercises: { exerciseId?: string; catalogId?: string | null; sets: number; repsRange: string; restSeconds: number; targetWeight?: number }[]
) {
  const trainer = await requireTrainer();
  const res = await planService.saveMasterPlanDay(trainer.trainerProfileId, planDayId, exercises);
  if (res.success) {
    revalidatePath("/trainer/plans");
  }
  return res;
}

export async function createClientProfile(
  name: string,
  phone: string,
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "STRENGTH" | "MAINTENANCE",
  calorieTarget: number,
  stepTarget: number,
  weightTarget?: number,
  age?: number,
  height?: number,
  injuries?: string,
  gymAccess?: string,
  email?: string,
  currentWeight?: number
) {
  const trainer = await requireTrainer();
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "http";

  const res = await clientService.createClientProfile(
    trainer.trainerProfileId,
    {
      name,
      phone,
      goal,
      calorieTarget,
      stepTarget,
      weightTarget,
      age,
      height,
      injuries,
      gymAccess,
      email,
      currentWeight,
    },
    host,
    proto
  );

  if (res.success) {
    revalidatePath("/trainer/clients");
    revalidatePath("/trainer/dashboard");
  }
  return res;
}

export async function deleteClientProfile(clientId: string) {
  const trainer = await requireTrainer();
  const res = await clientService.deleteClientProfile(trainer.trainerProfileId, clientId);
  if (res.success) {
    revalidatePath("/trainer/clients");
    revalidatePath("/trainer/dashboard");
  }
  return res;
}

export async function addWorkoutDay(planId: string, name: string) {
  const trainer = await requireTrainer();
  const res = await planService.addWorkoutDay(trainer.trainerProfileId, planId, name);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function deleteWorkoutDay(planDayId: string) {
  const trainer = await requireTrainer();
  const res = await planService.deleteWorkoutDay(trainer.trainerProfileId, planDayId);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function renameWorkoutDay(planDayId: string, newName: string) {
  const trainer = await requireTrainer();
  const res = await planService.renameWorkoutDay(trainer.trainerProfileId, planDayId, newName);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function logClientWorkoutSession(
  planDayId: string,
  notes: string,
  sets: { exerciseName: string; setNumber: number; weight: number; reps: number; targetWeight: number; targetReps: number }[]
) {
  const client = await requireClient();
  const res = await workoutService.logClientWorkoutSession(client.userId, planDayId, notes, sets);
  if (res.success) {
    revalidatePath(`/trainer/clients/${client.clientProfileId}`);
    revalidatePath("/trainer/dashboard");
    revalidatePath("/client/today");
  }
  return res;
}

export async function logClientDailyCheckIn(
  weight: number,
  sleepHours: number,
  energyScore: number,
  dietAdherence: boolean,
  notes?: string
) {
  const client = await requireClient();
  const res = await workoutService.logClientDailyCheckIn(client.userId, weight, sleepHours, energyScore, dietAdherence, notes);
  if (res.success) {
    revalidatePath(`/trainer/clients/${client.clientProfileId}`);
    revalidatePath("/trainer/dashboard");
  }
  return res;
}

export async function updateTrainerProfile(
  businessName: string,
  instagramHandle: string,
  coachingType: string
) {
  const trainer = await requireTrainer();
  const res = await trainerService.updateTrainerProfile(trainer.userId, businessName, instagramHandle, coachingType);
  if (res.success) {
    revalidatePath("/trainer/settings");
    revalidatePath("/trainer/dashboard");
  }
  return res;
}

export async function duplicateExercise(exerciseId: string) {
  const trainer = await requireTrainer();
  const res = await exerciseService.duplicateExercise(trainer.trainerProfileId, exerciseId);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function archiveExercise(exerciseId: string, archiveState: boolean) {
  const trainer = await requireTrainer();
  const res = await exerciseService.archiveExercise(trainer.trainerProfileId, exerciseId, archiveState);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function updateExerciseNotes(exerciseId: string, coachingNotes: string) {
  const trainer = await requireTrainer();
  const res = await exerciseService.updateExerciseNotes(trainer.trainerProfileId, exerciseId, coachingNotes);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function duplicatePlan(planId: string) {
  const trainer = await requireTrainer();
  const res = await planService.duplicatePlan(trainer.trainerProfileId, planId);
  if (res.success) {
    revalidatePath("/trainer/plans");
  }
  return res;
}

export async function loginTrainer(identifier: string, password: string) {
  const res = await authService.loginTrainer(identifier, password);
  if (res.success && res.token && res.expiresAt) {
    const cookieStore = await cookies();
    cookieStore.set("session", res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: res.expiresAt,
      path: "/",
    });
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function loginClient(identifier: string, password: string) {
  const res = await authService.loginClient(identifier, password);
  if (res.success && res.token && res.expiresAt) {
    const cookieStore = await cookies();
    cookieStore.set("session", res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: res.expiresAt,
      path: "/",
    });
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (token) {
      await authService.logout(token);
    }
    cookieStore.set("session", "", { path: "/", maxAge: 0 });
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return { success: false, error: "Failed to log out cleanly." };
  }
}

export async function registerTrainer(name: string, phone: string, password: string) {
  const res = await authService.registerTrainer(name, phone, password);
  if (res.success && res.token && res.expiresAt) {
    const cookieStore = await cookies();
    cookieStore.set("session", res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: res.expiresAt,
      path: "/",
    });
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function claimInvite(token: string, email: string, password: string) {
  const res = await authService.claimInvite(token, email, password);
  if (res.success && res.token && res.expiresAt) {
    const cookieStore = await cookies();
    cookieStore.set("session", res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: res.expiresAt,
      path: "/",
    });
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function uploadExerciseVideo(
  exerciseId: string,
  type: "main" | "side" | "mistakes",
  fileName: string,
  base64Data: string
) {
  const trainer = await requireTrainer();
  const res = await exerciseService.uploadExerciseVideo(trainer.trainerProfileId, exerciseId, type, fileName, base64Data);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath(`/trainer/plans/${exerciseId}`);
  }
  return res;
}

export async function planExercisesForDay(
  clientId: string,
  dateStr: string,
  exercises: {
    exerciseId?: string;
    catalogId?: string | null;
    sets: number;
    repsRange?: string | null;
    targetWeight?: number | null;
    supersetLabel?: string | null;
    coachingNote?: string | null;
  }[]
) {
  const trainer = await requireTrainer();
  const res = await planService.planExercisesForDay(trainer.trainerProfileId, clientId, dateStr, exercises);
  if (res.success) {
    revalidatePath(`/trainer/clients/${clientId}`);
    revalidatePath(`/trainer/clients/${clientId}/plan`);
    revalidatePath("/trainer/dashboard");
    revalidatePath("/client/today");
  }
  return res;
}

export async function removePlannedExercise(planExerciseId: string) {
  const trainer = await requireTrainer();
  const res = await planService.removePlannedExercise(trainer.trainerProfileId, planExerciseId);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
    revalidatePath("/client/today");
  }
  return res;
}

export async function createExercise(data: {
  name: string;
  muscleGroup: string;
  equipmentType: string;
  instructions: string;
  coachingNotes?: string;
  difficulty?: string;
}) {
  const trainer = await requireTrainer();
  const res = await exerciseService.createExercise(trainer.trainerProfileId, data);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function getOrCreateCustomExercise(name: string) {
  const trainer = await requireTrainer();
  const res = await exerciseService.getOrCreateCustomExercise(trainer.trainerProfileId, name);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function scheduleWorkoutDay(planDayId: string, dateStr: string | null) {
  const trainer = await requireTrainer();
  const res = await planService.scheduleWorkoutDay(trainer.trainerProfileId, planDayId, dateStr);
  if (res.success) {
    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/clients");
  }
  return res;
}

export async function uploadProgressPhoto(
  photoFrontBase64: string | null,
  photoSideBase64: string | null,
  photoBackBase64: string | null = null
) {
  const client = await requireClient();
  const res = await clientService.saveProgressPhotoSet(client.userId, photoFrontBase64, photoSideBase64, photoBackBase64);
  if (res.success) {
    revalidatePath("/client/progress");
  }
  return res;
}

export async function saveMealLog(
  name: string,
  imageBlobBase64: string | null,
  calories: number,
  protein: number,
  carbs: number,
  fats: number
) {
  const client = await requireClient();
  const res = await clientService.saveMealLog(client.userId, name, imageBlobBase64, calories, protein, carbs, fats);
  if (res.success) {
    revalidatePath("/client/today");
    revalidatePath("/client/meals");
    revalidatePath(`/trainer/clients/${client.clientProfileId}`);
  }
  return res;
}

export async function getClientMealLogs() {
  const client = await requireClient();
  return await clientService.getClientMealLogs(client.userId);
}

export async function submitTrainerMealFeedback(clientId: string, mealLogId: string, feedback: string) {
  const trainer = await requireTrainer();
  const res = await clientService.submitTrainerMealFeedback(trainer.trainerProfileId, mealLogId, feedback);
  if (res.success) {
    revalidatePath(`/trainer/clients/${clientId}`);
    revalidatePath("/client/meals");
    revalidatePath("/client/today");
  }
  return res;
}

export async function saveDailySteps(steps: number) {
  const client = await requireClient();
  const res = await workoutService.saveDailySteps(client.userId, steps);
  if (res.success) {
    revalidatePath("/client/today");
    revalidatePath(`/trainer/clients/${client.clientProfileId}`);
  }
  return res;
}
