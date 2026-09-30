import prisma from "@/lib/db";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { APP_CONFIG } from "@/lib/config";
import { saveBase64File } from "@/lib/utils/upload";
import { localDayStart } from "@/lib/utils/date";


async function verifyClientOwnership(clientId: string, trainerId: string) {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    throw new Error("Client profile not found.");
  }
  if (client.trainerId !== trainerId) {
    throw new Error("Unauthorized: client does not belong to this trainer.");
  }
  return client;
}

function resolveInviteOrigin(host: string | null, proto: string): string {
  if (APP_CONFIG.APP_URL) return APP_CONFIG.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return `${proto}://${host}`;
  }
  if (host) return `${proto}://${host}`;
  throw new Error("Unable to determine app URL for invite link. Set NEXT_PUBLIC_APP_URL.");
}

export async function updateClientTargets(
  trainerId: string,
  clientId: string,
  calories: number,
  steps: number,
  protein?: number,
  carbs?: number,
  fats?: number
) {
  if (calories < 0 || calories > APP_CONFIG.MAX_CALORIE_TARGET) {
    return { success: false, error: "Invalid calorie target" };
  }
  if (steps < 0 || steps > APP_CONFIG.MAX_STEP_TARGET) {
    return { success: false, error: "Invalid step target" };
  }
  if (protein !== undefined && (protein < 0 || protein > 1000)) {
    return { success: false, error: "Invalid protein target" };
  }
  if (carbs !== undefined && (carbs < 0 || carbs > 1000)) {
    return { success: false, error: "Invalid carbs target" };
  }
  if (fats !== undefined && (fats < 0 || fats > 500)) {
    return { success: false, error: "Invalid fats target" };
  }
  try {
    await verifyClientOwnership(clientId, trainerId);
    await prisma.clientProfile.update({
      where: { id: clientId },
      data: {
        calorieTarget: calories,
        stepTarget: steps,
        ...(protein !== undefined && { proteinTarget: protein }),
        ...(carbs !== undefined && { carbsTarget: carbs }),
        ...(fats !== undefined && { fatsTarget: fats }),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update targets:", error);
    return { success: false, error: error instanceof Error ? error.message : "Database update failed" };
  }
}

export function alertTriggerKey(alertType: string, triggers: string[]) {
  return `${alertType}:${[...triggers].sort().join("|")}`;
}

/** Hides this alert until the trigger set changes. */
export async function resolveAlert(trainerId: string, clientId: string, message: string, triggerKey: string) {
  try {
    await verifyClientOwnership(clientId, trainerId);

    await prisma.clientProfile.update({
      where: { id: clientId },
      data: { alertDismissedKey: triggerKey },
    });

    const latestScore = await prisma.aIHealthScore.findFirst({
      where: { clientProfileId: clientId },
      orderBy: { date: "desc" },
    });

    if (latestScore) {
      await prisma.aIHealthScore.update({
        where: { id: latestScore.id },
        data: {
          recommendation: message,
        },
      });
    } else {
      await prisma.aIHealthScore.create({
        data: {
          clientProfileId: clientId,
          healthScore: APP_CONFIG.RESOLVED_ALERT_HEALTH,
          riskScore: APP_CONFIG.RESOLVED_ALERT_RISK,
          recommendation: message,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to resolve alert:", error);
    return { success: false, error: error instanceof Error ? error.message : "Alert resolution failed" };
  }
}

export async function createClientProfile(
  trainerId: string,
  data: {
    name: string;
    phone: string;
    goal: "FAT_LOSS" | "MUSCLE_GAIN" | "STRENGTH" | "MAINTENANCE";
    calorieTarget: number;
    stepTarget: number;
    weightTarget?: number;
    age?: number;
    height?: number;
    injuries?: string;
    gymAccess?: string;
    email?: string;
    currentWeight?: number;
  },
  host: string | null,
  proto: string
) {
  try {
    const cleanPhone = data.phone.trim().replace(/[\s\-\(\)]/g, "");
    const normalizedEmail = data.email?.trim().toLowerCase() || null;

    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingUser) {
      return { success: false, error: "A user with this phone number already exists." };
    }
    if (normalizedEmail) {
      const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (emailTaken) {
        return { success: false, error: "A user with this email already exists." };
      }
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { id: trainerId },
    });
    if (!trainerProfile) {
      return { success: false, error: "Trainer profile not found." };
    }

    const inviteToken = crypto.randomUUID();
    const inviteExpires = new Date();
    inviteExpires.setHours(inviteExpires.getHours() + APP_CONFIG.INVITE_EXPIRY_HOURS);
    const dayStart = localDayStart();

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          phone: cleanPhone,
          email: normalizedEmail,
          role: "CLIENT",
          inviteToken,
          inviteExpires,
          clientProfile: {
            create: {
              trainerId,
              goal: data.goal,
              calorieTarget: data.calorieTarget,
              stepTarget: data.stepTarget,
              weightTarget: data.weightTarget || null,
              age: data.age || null,
              height: data.height || null,
              injuries: data.injuries || null,
              gymAccess: data.gymAccess || null,
            },
          },
        },
        include: { clientProfile: true },
      });

      if (data.currentWeight !== undefined && user.clientProfile) {
        await tx.dailyCheckIn.create({
          data: {
            clientProfileId: user.clientProfile.id,
            weight: data.currentWeight,
            date: dayStart,
            dietAdherence: false,
          },
        });
      }

      return user;
    });

    const origin = resolveInviteOrigin(host, proto);
    const inviteLink = `${origin}/invite/${inviteToken}`;
    return { success: true, inviteLink };
  } catch (error) {
    console.error("Failed to onboard client:", error);
    return { success: false, error: "Failed to create client profile in database." };
  }
}

export async function deleteClientProfile(trainerId: string, clientId: string) {
  try {
    const client = await verifyClientOwnership(clientId, trainerId);
    const userId = client.userId;

    await prisma.$transaction(async (tx) => {
      await tx.clientProfile.update({
        where: { id: clientId },
        data: { currentPlanId: null },
      });
      // Cascades client profile + related logs via User → ClientProfile
      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete client." };
  }
}

export async function saveProgressPhotoSet(
  clientUserId: string,
  photoFrontBase64: string | null,
  photoSideBase64: string | null,
  photoBackBase64: string | null = null
) {
  try {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });
    if (!clientProfile) {
      return { success: false, error: "Client profile not found." };
    }
    const clientId = clientProfile.id;

    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

    const savePhoto = async (base64Str: string | null, typeLabel: string) => {
      if (!base64Str) return null;
      const res = await saveBase64File({
        base64Str,
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        fileNamePrefix: `progress_${clientId}_${typeLabel}`,
      });
      if (!res.success || !res.url) {
        throw new Error(res.error || "Failed to save progress photo");
      }
      return res.url;
    };

    const photoFrontUrl = await savePhoto(photoFrontBase64, "front");
    const photoSideUrl = await savePhoto(photoSideBase64, "side");
    const photoBackUrl = await savePhoto(photoBackBase64, "back");

    const record = await prisma.progressPhotoSet.create({
      data: {
        clientProfileId: clientId,
        photoFrontUrl,
        photoSideUrl,
        photoBackUrl,
      },
    });

    return { success: true, photoSet: record };
  } catch (error) {
    console.error("Failed to save progress photos:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save progress photos." };
  }
}

export async function autoCleanupMealLogs(clientId: string) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - APP_CONFIG.MEAL_LOG_RETENTION_DAYS);

    const oldMealLogs = await prisma.mealLog.findMany({
      where: {
        clientProfileId: clientId,
        loggedAt: { lt: thirtyDaysAgo },
      },
    });

    for (const log of oldMealLogs) {
      if (log.imageUrl && log.imageUrl.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), "public", log.imageUrl);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.warn(`Failed to delete meal log file at ${filePath}:`, err);
        }
      }
    }

    if (oldMealLogs.length > 0) {
      await prisma.mealLog.deleteMany({
        where: { id: { in: oldMealLogs.map((log) => log.id) } },
      });
    }
  } catch (error) {
    console.error("Meal logs auto cleanup failed:", error);
  }
}

export async function saveMealLog(
  clientUserId: string,
  name: string,
  imageBlobBase64: string | null,
  calories: number,
  protein: number,
  carbs: number,
  fats: number
) {
  if (calories < 0 || protein < 0 || carbs < 0 || fats < 0) {
    return { success: false, error: "Macro values cannot be negative" };
  }
  try {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });
    if (!clientProfile) {
      return { success: false, error: "Client profile not found." };
    }
    const clientId = clientProfile.id;

    // Run cleanup asynchronously to avoid blocking the client request
    autoCleanupMealLogs(clientId).catch((err) => {
      console.error("Async autoCleanupMealLogs failed in saveMealLog:", err);
    });

    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

    let imageUrl: string | null = null;
    if (imageBlobBase64) {
      const res = await saveBase64File({
        base64Str: imageBlobBase64,
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        fileNamePrefix: `meal_${clientId}`,
      });
      if (!res.success || !res.url) {
        throw new Error(res.error || "Failed to save meal log image");
      }
      imageUrl = res.url;
    }

    const mealLog = await prisma.mealLog.create({
      data: {
        clientProfileId: clientId,
        name,
        imageUrl,
        calories,
        protein,
        carbs,
        fats,
      },
    });

    return { success: true, mealLog };
  } catch (error) {
    console.error("Failed to save meal log:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save meal log." };
  }
}

export async function getClientMealLogs(clientUserId: string) {
  try {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });
    if (!clientProfile) {
      return { success: false, error: "Client profile not found." };
    }

    // Run cleanup asynchronously to avoid blocking the client request
    autoCleanupMealLogs(clientProfile.id).catch((err) => {
      console.error("Async autoCleanupMealLogs failed in getClientMealLogs:", err);
    });

    const logs = await prisma.mealLog.findMany({
      where: { clientProfileId: clientProfile.id },
      orderBy: { loggedAt: "desc" },
    });
    return { success: true, logs };
  } catch (error) {
    console.error("Failed to get client meal logs:", error);
    return { success: false, error: "Failed to fetch meal logs." };
  }
}

export async function submitTrainerMealFeedback(trainerId: string, mealLogId: string, feedback: string) {
  try {
    const mealLog = await prisma.mealLog.findUnique({
      where: { id: mealLogId },
      include: { client: true },
    });
    if (!mealLog) {
      return { success: false, error: "Meal log not found." };
    }
    if (mealLog.client.trainerId !== trainerId) {
      return { success: false, error: "Unauthorized: meal log does not belong to this trainer's client." };
    }

    await prisma.mealLog.update({
      where: { id: mealLogId },
      data: {
        trainerFeedback: feedback,
        feedbackAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save trainer feedback:", error);
    return { success: false, error: "Failed to submit feedback." };
  }
}
