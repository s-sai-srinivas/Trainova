import prisma from "@/lib/db";
import { WORKOUT_DEFAULTS } from "@/lib/config";
import { Prisma } from "@prisma/client";
import { resolvePlannedExerciseIds } from "@/lib/services/exerciseService";

async function verifyPlanOwnership(planId: string, trainerId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found.");
  if (plan.trainerId !== trainerId) throw new Error("Unauthorized: plan does not belong to this trainer.");
  return plan;
}

async function verifyClientOwnership(clientId: string, trainerId: string) {
  const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Client profile not found.");
  if (client.trainerId !== trainerId) throw new Error("Unauthorized: client does not belong to this trainer.");
  return client;
}

async function assertExercisesOwnedByTrainer(
  trainerId: string,
  exerciseIds: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  const uniqueIds = [...new Set(exerciseIds.filter(Boolean))];
  if (uniqueIds.length === 0) return { success: true };

  const owned = await prisma.exercise.count({
    where: { id: { in: uniqueIds }, trainerId },
  });
  if (owned !== uniqueIds.length) {
    return { success: false, error: "One or more exercises do not belong to this trainer." };
  }
  return { success: true };
}

async function scaffoldDefaultPlan(trainerId: string, name: string, description: string) {
  return await prisma.plan.create({
    data: {
      trainerId,
      name,
      description,
      workoutDays: {
        create: WORKOUT_DEFAULTS.DAY_NAMES.map((dayName, idx) => ({
          dayNumber: idx + 1,
          name: dayName,
        })),
      },
    },
    include: { workoutDays: true },
  });
}

async function clonePlanForClient(
  trainerId: string,
  clientId: string,
  clientName: string,
  currentPlanId: string,
  clearScheduledDates = true
) {
  const oldPlan = await prisma.plan.findUnique({
    where: { id: currentPlanId },
    include: { workoutDays: { include: { exercises: true } } },
  });

  if (!oldPlan) {
    throw new Error("Plan template not found.");
  }

  const clonedPlan = await prisma.plan.create({
    data: {
      trainerId,
      name: `${clientName} - Custom Plan`,
      description: `Customized specifically for ${clientName} (cloned from ${oldPlan.name})`,
      workoutDays: {
        create: oldPlan.workoutDays.map((day) => ({
          dayNumber: day.dayNumber,
          name: day.name,
          scheduledDate: clearScheduledDates ? null : day.scheduledDate,
          exercises: {
            create: day.exercises.map((ex) => ({
              exercise: { connect: { id: ex.exerciseId } },
              sets: ex.sets,
              repsRange: ex.repsRange,
              restSeconds: ex.restSeconds,
              targetWeight: ex.targetWeight,
              setsJson: ex.setsJson ? (ex.setsJson as Prisma.InputJsonValue) : undefined,
              supersetLabel: ex.supersetLabel || null,
              coachingNote: ex.coachingNote || null,
            })),
          },
        })),
      },
    },
    include: { workoutDays: true },
  });

  await prisma.clientProfile.update({
    where: { id: clientId },
    data: { currentPlanId: clonedPlan.id },
  });

  return clonedPlan;
}

function remapDayId(
  oldDayId: string,
  oldPlan: { workoutDays: { id: string; name: string; dayNumber: number }[] } | null | undefined,
  clonedPlan: { workoutDays: { id: string; name: string; dayNumber: number }[] }
): string | null {
  const oldDay = oldPlan?.workoutDays.find((d) => d.id === oldDayId);
  if (!oldDay) return null;
  const match = clonedPlan.workoutDays.find(
    (d) => d.name === oldDay.name || d.dayNumber === oldDay.dayNumber
  );
  return match?.id ?? null;
}

export async function createNewPlan(trainerId: string, name: string, description: string) {
  try {
    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { id: trainerId } });
    if (!trainerProfile) {
      return { success: false, error: "Trainer profile not found." };
    }

    const newPlan = await scaffoldDefaultPlan(trainerId, name, description);
    return { success: true, planId: newPlan.id };
  } catch (error) {
    console.error("Failed to create new plan:", error);
    return { success: false, error: "Database transaction failed" };
  }
}

/** Always clones template so each client gets an isolated plan. */
export async function assignPlanToClient(trainerId: string, clientId: string, planId: string) {
  try {
    const client = await verifyClientOwnership(clientId, trainerId);
    await verifyPlanOwnership(planId, trainerId);

    const clientUser = await prisma.user.findUnique({ where: { id: client.userId } });
    const name = clientUser?.name || "Client";
    await clonePlanForClient(trainerId, clientId, name, planId, true);

    return { success: true };
  } catch (error) {
    console.error("Failed to assign plan:", error);
    return { success: false, error: error instanceof Error ? error.message : "Assign transaction failed" };
  }
}

export async function saveClientCustomPlan(
  trainerId: string,
  clientId: string,
  planDayId: string,
  exercises: { exerciseId?: string; catalogId?: string | null; sets: number; repsRange: string; restSeconds: number; targetWeight?: number }[]
) {
  try {
    await verifyClientOwnership(clientId, trainerId);
    const resolved = await resolvePlannedExerciseIds(trainerId, exercises);
    if (!resolved.success) return resolved;
    const exercisesWithIds = exercises.map((ex, i) => ({ ...ex, exerciseId: resolved.exerciseIds[i] }));
    const owned = await assertExercisesOwnedByTrainer(
      trainerId,
      exercisesWithIds.map((e) => e.exerciseId)
    );
    if (!owned.success) return owned;

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: { user: true, currentPlan: { include: { workoutDays: true } } },
    });

    if (!client) {
      return { success: false, error: "Client profile not found." };
    }

    let planId = client.currentPlanId;
    let targetDayId = planDayId;

    if (!planId) {
      const newPlan = await scaffoldDefaultPlan(
        trainerId,
        `${client.user.name} - Custom Plan`,
        `Customized specifically for ${client.user.name}`
      );

      await prisma.clientProfile.update({
        where: { id: clientId },
        data: { currentPlanId: newPlan.id },
      });

      planId = newPlan.id;
      targetDayId = newPlan.workoutDays[0].id;
    } else {
      const dayOnPlan = client.currentPlan?.workoutDays.find((d) => d.id === planDayId);
      if (!dayOnPlan) {
        return { success: false, error: "Workout day does not belong to this client's plan." };
      }

      const usageCount = await prisma.clientProfile.count({
        where: { currentPlanId: planId },
      });

      if (usageCount > 1) {
        const oldPlan = client.currentPlan;
        const clonedPlan = await clonePlanForClient(trainerId, clientId, client.user.name, planId);
        planId = clonedPlan.id;
        const remapped = remapDayId(planDayId, oldPlan, clonedPlan);
        if (!remapped) {
          return { success: false, error: "Failed to map workout day onto cloned plan." };
        }
        targetDayId = remapped;
      }
    }

    await prisma.$transaction([
      prisma.planExercise.deleteMany({
        where: { planWorkoutDayId: targetDayId },
      }),
      prisma.planExercise.createMany({
        data: exercisesWithIds.map((ex) => ({
          planWorkoutDayId: targetDayId,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repsRange: ex.repsRange,
          restSeconds: ex.restSeconds,
          targetWeight: ex.targetWeight ?? WORKOUT_DEFAULTS.DEFAULT_TARGET_WEIGHT,
        })),
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to save custom plan:", error);
    return { success: false, error: error instanceof Error ? error.message : "Database transaction failed" };
  }
}

export async function saveMasterPlanDay(
  trainerId: string,
  planDayId: string,
  exercises: { exerciseId?: string; catalogId?: string | null; sets: number; repsRange: string; restSeconds: number; targetWeight?: number }[]
) {
  try {
    const day = await prisma.planWorkoutDay.findUnique({
      where: { id: planDayId },
      include: { plan: true },
    });
    if (!day) return { success: false, error: "Workout day not found." };
    if (day.plan.trainerId !== trainerId) return { success: false, error: "Unauthorized." };

    const resolved = await resolvePlannedExerciseIds(trainerId, exercises);
    if (!resolved.success) return resolved;
    const exercisesWithIds = exercises.map((ex, i) => ({ ...ex, exerciseId: resolved.exerciseIds[i] }));
    const owned = await assertExercisesOwnedByTrainer(
      trainerId,
      exercisesWithIds.map((e) => e.exerciseId)
    );
    if (!owned.success) return owned;

    await prisma.$transaction([
      prisma.planExercise.deleteMany({
        where: { planWorkoutDayId: planDayId },
      }),
      prisma.planExercise.createMany({
        data: exercisesWithIds.map((ex) => ({
          planWorkoutDayId: planDayId,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repsRange: ex.repsRange,
          restSeconds: ex.restSeconds,
          targetWeight: ex.targetWeight ?? WORKOUT_DEFAULTS.DEFAULT_TARGET_WEIGHT,
        })),
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to save master plan:", error);
    return { success: false, error: "Database transaction failed" };
  }
}

export async function addWorkoutDay(trainerId: string, planId: string, name: string) {
  try {
    await verifyPlanOwnership(planId, trainerId);
    const dayCount = await prisma.planWorkoutDay.count({ where: { planId } });

    const newDay = await prisma.planWorkoutDay.create({
      data: {
        planId,
        name,
        dayNumber: dayCount + 1,
      },
    });

    return { success: true, dayId: newDay.id };
  } catch (error) {
    console.error("Failed to add workout day:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add workout day." };
  }
}

export async function deleteWorkoutDay(trainerId: string, planDayId: string) {
  try {
    const day = await prisma.planWorkoutDay.findUnique({
      where: { id: planDayId },
      include: { plan: true },
    });
    if (!day) return { success: false, error: "Workout day not found." };
    if (day.plan.trainerId !== trainerId) return { success: false, error: "Unauthorized." };

    // Wipe logs first so FK restrict (pre-migration) or cascade both succeed
    await prisma.workoutLog.deleteMany({ where: { planWorkoutDayId: planDayId } });
    const deletedDay = await prisma.planWorkoutDay.delete({ where: { id: planDayId } });

    const remainingDays = await prisma.planWorkoutDay.findMany({
      where: { planId: deletedDay.planId },
      orderBy: { dayNumber: "asc" },
    });

    await prisma.$transaction(
      remainingDays.map((d, idx) =>
        prisma.planWorkoutDay.update({
          where: { id: d.id },
          data: { dayNumber: idx + 1 },
        })
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to delete workout day:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete workout day." };
  }
}

export async function renameWorkoutDay(trainerId: string, planDayId: string, newName: string) {
  try {
    const day = await prisma.planWorkoutDay.findUnique({
      where: { id: planDayId },
      include: { plan: true },
    });
    if (!day) return { success: false, error: "Workout day not found." };
    if (day.plan.trainerId !== trainerId) return { success: false, error: "Unauthorized." };

    await prisma.planWorkoutDay.update({
      where: { id: planDayId },
      data: { name: newName },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to rename workout day:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to rename workout day." };
  }
}

export async function duplicatePlan(trainerId: string, planId: string) {
  try {
    await verifyPlanOwnership(planId, trainerId);

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        workoutDays: {
          include: { exercises: true },
        },
      },
    });

    if (!plan) return { success: false, error: "Plan template not found." };

    const clonedPlan = await prisma.plan.create({
      data: {
        trainerId,
        name: `${plan.name} (Copy)`,
        description: plan.description,
        workoutDays: {
          create: plan.workoutDays.map((day) => ({
            dayNumber: day.dayNumber,
            name: day.name,
            scheduledDate: null,
            exercises: {
              create: day.exercises.map((ex) => ({
                exercise: { connect: { id: ex.exerciseId } },
                sets: ex.sets,
                repsRange: ex.repsRange,
                restSeconds: ex.restSeconds,
                targetWeight: ex.targetWeight,
                setsJson: ex.setsJson ? (ex.setsJson as Prisma.InputJsonValue) : undefined,
                supersetLabel: ex.supersetLabel || null,
                coachingNote: ex.coachingNote || null,
              })),
            },
          })),
        },
      },
    });

    return { success: true, planId: clonedPlan.id };
  } catch (error) {
    console.error("Failed to duplicate plan template:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to duplicate plan." };
  }
}

export async function planExercisesForDay(
  trainerId: string,
  clientId: string,
  dateStr: string,
  exercises: {
    exerciseId?: string;
    catalogId?: string | null;
    sets: number;
    repsRange?: string | null;
    restSeconds?: number | null;
    targetWeight?: number | null;
    supersetLabel?: string | null;
    coachingNote?: string | null;
  }[]
) {
  try {
    await verifyClientOwnership(clientId, trainerId);
    const resolved = await resolvePlannedExerciseIds(trainerId, exercises);
    if (!resolved.success) return resolved;
    const exercisesWithIds = exercises.map((ex, i) => ({ ...ex, exerciseId: resolved.exerciseIds[i] }));
    const owned = await assertExercisesOwnedByTrainer(
      trainerId,
      exercisesWithIds.map((e) => e.exerciseId)
    );
    if (!owned.success) return owned;

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: { user: true, currentPlan: { include: { workoutDays: true } } },
    });

    if (!client) {
      return { success: false, error: "Client profile not found." };
    }

    let planId = client.currentPlanId;

    if (!planId) {
      const newPlan = await scaffoldDefaultPlan(
        trainerId,
        `${client.user.name} - Custom Plan`,
        `Customized specifically for ${client.user.name}`
      );

      await prisma.clientProfile.update({
        where: { id: clientId },
        data: { currentPlanId: newPlan.id },
      });

      planId = newPlan.id;
    } else {
      const usageCount = await prisma.clientProfile.count({
        where: { currentPlanId: planId },
      });

      if (usageCount > 1) {
        const clonedPlan = await clonePlanForClient(trainerId, clientId, client.user.name, planId);
        planId = clonedPlan.id;
      }
    }

    const targetDate = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00.000Z`);
    const yyyy = targetDate.getUTCFullYear();
    const mm = targetDate.getUTCMonth();
    const dd = targetDate.getUTCDate();

    const startOfDay = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999));

    let workoutDay = await prisma.planWorkoutDay.findFirst({
      where: {
        planId,
        scheduledDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    const dateFormatted = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const dayName = `${dateFormatted} - Planned Workout`;

    if (!workoutDay) {
      if (exercises.length === 0) {
        return { success: true, workoutDayId: null };
      }
      workoutDay = await prisma.planWorkoutDay.create({
        data: {
          planId: planId!,
          dayNumber: 0,
          name: dayName,
          scheduledDate: startOfDay,
        },
      });
    }

    if (exercises.length === 0) {
      await prisma.planExercise.deleteMany({
        where: { planWorkoutDayId: workoutDay.id },
      });

      const logCount = await prisma.workoutLog.count({
        where: { planWorkoutDayId: workoutDay.id },
      });

      if (logCount === 0) {
        await prisma.planWorkoutDay.delete({ where: { id: workoutDay.id } });
      }

      return { success: true, workoutDayId: null };
    }

    await prisma.$transaction([
      prisma.planExercise.deleteMany({
        where: { planWorkoutDayId: workoutDay.id },
      }),
      prisma.planExercise.createMany({
        data: exercisesWithIds.map((ex) => ({
          planWorkoutDayId: workoutDay!.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repsRange: ex.repsRange || "—",
          restSeconds: ex.restSeconds ?? WORKOUT_DEFAULTS.REST_SECONDS,
          targetWeight: ex.targetWeight ?? WORKOUT_DEFAULTS.DEFAULT_TARGET_WEIGHT,
          supersetLabel: ex.supersetLabel || null,
          coachingNote: ex.coachingNote || null,
        })),
      }),
    ]);

    return { success: true, workoutDayId: workoutDay.id };
  } catch (error) {
    console.error("Failed to plan exercises for day:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to plan exercises for day." };
  }
}

export async function removePlannedExercise(trainerId: string, planExerciseId: string) {
  try {
    const planExercise = await prisma.planExercise.findUnique({
      where: { id: planExerciseId },
      include: { planWorkoutDay: { include: { plan: true } } },
    });
    if (!planExercise) return { success: false, error: "Exercise not found." };
    if (planExercise.planWorkoutDay.plan.trainerId !== trainerId) {
      return { success: false, error: "Unauthorized." };
    }

    await prisma.planExercise.delete({ where: { id: planExerciseId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to remove planned exercise:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove planned exercise." };
  }
}

export async function scheduleWorkoutDay(trainerId: string, planDayId: string, dateStr: string | null) {
  try {
    const day = await prisma.planWorkoutDay.findUnique({
      where: { id: planDayId },
      include: { plan: true },
    });
    if (!day) return { success: false, error: "Workout day not found." };
    if (day.plan.trainerId !== trainerId) return { success: false, error: "Unauthorized." };

    let utcDate: Date | null = null;
    if (dateStr) {
      const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00.000Z`);
      utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    }
    await prisma.planWorkoutDay.update({
      where: { id: planDayId },
      data: { scheduledDate: utcDate },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to schedule workout day:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to schedule workout day." };
  }
}
