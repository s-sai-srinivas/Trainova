import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import TodayWorkspace from "./TodayWorkspace";
import { mapPlannedExercise } from "@/lib/planMapping";
import { localDayBounds } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function ClientTodayPage() {
  const session = await getSession();

  if (!session || session.role !== "CLIENT") {
    redirect("/login");
  }

  const { start: dayStart, end: dayEnd } = localDayBounds();

  // Fetch client profile and plan days
  const client = await prisma.clientProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      currentPlan: {
        include: {
          workoutDays: {
            orderBy: { dayNumber: "asc" },
            include: {
              exercises: {
                include: {
                  exercise: true,
                },
              },
            },
          },
        },
      },
      checkIns: {
        orderBy: { date: "desc" },
        take: 7,
      },
      mealLogs: {
        orderBy: { loggedAt: "desc" },
      },
      workoutLogs: {
        where: { date: { gte: dayStart, lte: dayEnd } },
        include: { setLogs: true },
      },
    },
  });

  if (!client) {
    redirect("/login");
  }

  // Format plan days for client logging
  const clientPlanDays = client.currentPlan
    ? client.currentPlan.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        dayNumber: day.dayNumber,
        scheduledDate: day.scheduledDate ? day.scheduledDate.toISOString().split("T")[0] : null,
        exercises: day.exercises.map((ex) => mapPlannedExercise(ex)),
      }))
    : [];

  const mealLogs = client.mealLogs.map((m) => ({
    id: m.id,
    name: m.name,
    imageUrl: m.imageUrl,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fats: m.fats,
    loggedAt: m.loggedAt.toISOString(),
    trainerFeedback: m.trainerFeedback,
    feedbackAt: m.feedbackAt ? m.feedbackAt.toISOString() : null,
  }));

  return (
    <TodayWorkspace 
      client={{
        id: client.id,
        name: client.user.name,
        goal: client.goal.toString(),
        calorieTarget: client.calorieTarget,
        stepTarget: client.stepTarget,
        proteinTarget: client.proteinTarget,
        carbsTarget: client.carbsTarget,
        fatsTarget: client.fatsTarget,
        currentPlanId: client.currentPlanId,
      }}
      clientPlanDays={clientPlanDays}
      initialCheckIns={client.checkIns.map(c => ({
        id: c.id,
        date: c.date.toISOString(),
        weight: c.weight,
        sleepHours: c.sleepHours,
        energyScore: c.energyScore,
        dietAdherence: c.dietAdherence
      }))}
      mealLogs={mealLogs}
      todaySetLogs={client.workoutLogs.flatMap((log) =>
        log.setLogs.map((s) => ({
          planDayId: log.planWorkoutDayId,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
        }))
      )}
      hasCheckinToday={client.checkIns.some((c) => {
        const t = new Date(c.date).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      })}
    />
  );
}
