import prisma from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";
import { localDayBounds, localDayStart } from "@/lib/utils/date";

export async function logClientWorkoutSession(
  clientUserId: string,
  planDayId: string,
  notes: string,
  sets: { exerciseName: string; setNumber: number; weight: number; reps: number; targetWeight: number; targetReps: number }[]
) {
  try {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });
    if (!clientProfile) {
      return { success: false, error: "Client profile not found." };
    }
    if (!clientProfile.currentPlanId) {
      return { success: false, error: "No active plan assigned." };
    }

    const day = await prisma.planWorkoutDay.findUnique({
      where: { id: planDayId },
    });
    if (!day || day.planId !== clientProfile.currentPlanId) {
      return { success: false, error: "Workout day does not belong to your plan." };
    }

    const clientId = clientProfile.id;
    const { start, end } = localDayBounds();

    const existing = await prisma.workoutLog.findFirst({
      where: {
        clientProfileId: clientId,
        planWorkoutDayId: planDayId,
        date: { gte: start, lte: end },
      },
    });

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.setLog.deleteMany({ where: { workoutLogId: existing.id } });
        if (sets.length === 0) {
          await tx.workoutLog.delete({ where: { id: existing.id } });
          return;
        }
        await tx.setLog.createMany({
          data: sets.map((s) => ({
            workoutLogId: existing.id,
            exerciseName: s.exerciseName,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
          })),
        });
      });
    } else if (sets.length > 0) {
      await prisma.workoutLog.create({
        data: {
          clientProfileId: clientId,
          planWorkoutDayId: planDayId,
          date: localDayStart(),
          notes: notes || null,
          setLogs: {
            create: sets.map((s) => ({
              exerciseName: s.exerciseName,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              targetWeight: s.targetWeight,
              targetReps: s.targetReps,
            })),
          },
        },
      });
    }

    return { success: true, savedSets: sets.length };
  } catch (error) {
    console.error("Failed to log workout session:", error);
    return { success: false, error: "Failed to log workout session." };
  }
}

export async function logClientDailyCheckIn(
  clientUserId: string,
  weight: number,
  sleepHours: number,
  energyScore: number,
  dietAdherence: boolean,
  notes?: string
) {
  try {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });

    if (!client) {
      return { success: false, error: "Client not found." };
    }

    const clientId = client.id;
    const { start, end } = localDayBounds();
    const dayStart = localDayStart();

    const existingCheckIn = await prisma.dailyCheckIn.findFirst({
      where: {
        clientProfileId: clientId,
        date: { gte: start, lte: end },
      },
    });

    const data = {
      weight: weight === undefined || weight === null || Number.isNaN(weight) ? null : weight,
      sleepHours: sleepHours === undefined || sleepHours === null || Number.isNaN(sleepHours) ? null : sleepHours,
      energyScore: energyScore === undefined || energyScore === null || Number.isNaN(energyScore) ? null : energyScore,
      dietAdherence,
      notes: notes || null,
      targetCaloriesSnapped: client.calorieTarget,
      targetProteinSnapped: client.proteinTarget,
      targetStepsSnapped: client.stepTarget,
    };

    if (existingCheckIn) {
      await prisma.dailyCheckIn.update({
        where: { id: existingCheckIn.id },
        data,
      });
    } else {
      await prisma.dailyCheckIn.create({
        data: {
          clientProfileId: clientId,
          date: dayStart,
          ...data,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to log daily check-in:", error);
    return { success: false, error: "Failed to log daily check-in." };
  }
}

export async function saveDailySteps(clientUserId: string, steps: number) {
  try {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId },
    });
    if (!client) {
      return { success: false, error: "Client not found." };
    }

    const clientId = client.id;
    const { start, end } = localDayBounds();
    const dayStart = localDayStart();

    const existingCheckIn = await prisma.dailyCheckIn.findFirst({
      where: {
        clientProfileId: clientId,
        date: { gte: start, lte: end },
      },
    });

    if (existingCheckIn) {
      await prisma.dailyCheckIn.update({
        where: { id: existingCheckIn.id },
        data: { stepsLogged: steps },
      });
    } else {
      await prisma.dailyCheckIn.create({
        data: {
          clientProfileId: clientId,
          date: dayStart,
          stepsLogged: steps,
          dietAdherence: false,
          targetCaloriesSnapped: client.calorieTarget,
          targetProteinSnapped: client.proteinTarget,
          targetStepsSnapped: client.stepTarget,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save daily steps:", error);
    return { success: false, error: "Failed to save steps." };
  }
}
