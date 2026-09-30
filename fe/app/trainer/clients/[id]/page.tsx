import prisma from "@/lib/db";
import ClientWorkspace from "@/components/ClientWorkspace";
import { notFound, redirect } from "next/navigation";
import { WorkoutLogData } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { mapPlannedExercise } from "@/lib/planMapping";

export const dynamic = "force-dynamic";

interface ClientPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function ClientDetailPage({ params, searchParams }: ClientPageProps) {
  const session = await getSession();
  if (!session || session.role !== "TRAINER") redirect("/login");

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!trainerProfile) redirect("/login");

  const { id } = await params;
  const { tab } = (await searchParams) || {};

  // 1. Fetch Client Profile along with User record and active plan days/exercises
  const client = await prisma.clientProfile.findFirst({
    where: { id, trainerId: trainerProfile.id },
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
      healthScores: {
        orderBy: { date: "desc" },
        take: 1,
      },
      checkIns: {
        orderBy: { date: "desc" },
        take: 10,
      },
      workoutLogs: {
        orderBy: { date: "desc" },
        take: 10,
        include: {
          setLogs: true,
          workoutDay: true,
        },
      },
      progressPhotoSets: {
        orderBy: { date: "desc" },
        take: 10,
      },
      mealLogs: {
        orderBy: { loggedAt: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  // 2. Fetch this trainer's exercises, master plans and completed session count
  const [exerciseLibrary, masterPlans, completedSessionsCount] = await Promise.all([
    prisma.exercise.findMany({
      where: { trainerId: trainerProfile.id },
      orderBy: { name: "asc" },
    }),
    prisma.plan.findMany({
      where: {
        trainerId: trainerProfile.id,
        NOT: { name: { contains: "- Custom Plan" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.workoutLog.count({
      where: { clientProfileId: id },
    }),
  ]);

  // 3. Map client plan days
  const clientPlanDays = client.currentPlan
    ? client.currentPlan.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        dayNumber: day.dayNumber,
        scheduledDate: day.scheduledDate ? day.scheduledDate.toISOString().split("T")[0] : null,
        exercises: day.exercises.map((ex) => mapPlannedExercise(ex)),
      }))
    : [];

  // 4. Format exercise library for bottom drawer search
  const formattedLibrary = exerciseLibrary.map((ex) => ({
    id: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipmentType: ex.equipmentType,
    coachingCue: ex.coachingNotes ?? "",
    instructions: ex.instructions,
    archived: ex.archived,
    videoMain: ex.videoMain,
    videoSide: ex.videoSide,
    videoMistakes: ex.videoMistakes,
  }));

  // 5. Format master templates list
  const formattedTemplates = masterPlans.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  // 6. Map direct checkin history
  const checkInsData = client.checkIns.map((c) => ({
    date: c.date.toISOString(),
    weight: c.weight,
    sleepHours: c.sleepHours,
    energyScore: c.energyScore,
    dietAdherence: c.dietAdherence,
    stepsLogged: c.stepsLogged,
  }));

  // 7. Map workout matrix logs (target vs actual logs)
  const logsData: WorkoutLogData[] = [];
  client.workoutLogs.forEach((log) => {
    log.setLogs.forEach((set) => {
      logsData.push({
        date: log.date.toISOString(),
        exerciseName: set.exerciseName || "Exercise", // Displaying actual exercise name with fallback
        workoutDayName: log.workoutDay.name, // Displaying Day name (e.g. Day 1: Push A)
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        targetWeight: set.targetWeight,
        targetReps: set.targetReps,
      });
    });
  });

  const finalLogs = logsData;

  // 8. Map progress photo sets
  const photoSets = client.progressPhotoSets.map((p) => ({
    date: p.date.toISOString(),
    photoFrontUrl: p.photoFrontUrl,
    photoSideUrl: p.photoSideUrl,
  }));

  // 9. Map meal logs
  const mealLogsData = client.mealLogs.map((m) => ({
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
    <ClientWorkspace
      client={{
        id: client.id,
        name: client.user.name,
        phone: client.user.phone,
        goal: client.goal.toString(),
        calorieTarget: client.calorieTarget,
        stepTarget: client.stepTarget,
        proteinTarget: client.proteinTarget,
        carbsTarget: client.carbsTarget,
        fatsTarget: client.fatsTarget,
        aiSummary: client.healthScores[0]?.recommendation ?? "Consistent compliance logs. Maintain progressive load.",
        currentPlanId: client.currentPlanId,
        currentPlanName: client.currentPlan?.name ?? null,
        completedSessionsCount,
        createdAt: client.user.createdAt.toISOString(),
        age: client.age,
        injuries: client.injuries,
        experienceLevel: client.experienceLevel,
        gymAccess: client.gymAccess,
        weightTarget: client.weightTarget,
      }}
      checkIns={checkInsData}
      workoutLogs={finalLogs}
      photos={photoSets}
      clientPlanDays={clientPlanDays}
      exerciseLibrary={formattedLibrary}
      masterPlanTemplates={formattedTemplates}
      mealLogs={mealLogsData}
      initialTab={tab}
    />
  );
}
