import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import QuickPlanner from "@/components/QuickPlanner";
import { getSession } from "@/lib/auth";
import { mapPlannedExercise } from "@/lib/planMapping";

export const dynamic = "force-dynamic";

interface PlanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClientPlanPage({ params }: PlanPageProps) {
  const session = await getSession();
  if (!session || session.role !== "TRAINER") redirect("/login");

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!trainerProfile) redirect("/login");

  const { id } = await params;

  const client = await prisma.clientProfile.findFirst({
    where: { id, trainerId: trainerProfile.id },
    include: {
      user: true,
      currentPlan: {
        include: {
          workoutDays: {
            include: {
              exercises: {
                orderBy: { id: "asc" },
                include: {
                  exercise: true,
                },
              },
            },
          },
        },
      },
      workoutLogs: {
        orderBy: { date: "desc" },
        take: 10,
        include: {
          setLogs: true,
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const clientPlanDays = client.currentPlan
    ? client.currentPlan.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        dayNumber: day.dayNumber,
        scheduledDate: day.scheduledDate ? day.scheduledDate.toISOString().split("T")[0] : null,
        exercises: day.exercises.map((ex) => mapPlannedExercise(ex)),
      }))
    : [];

  const workoutLogsData = client.workoutLogs.map((log) => ({
    date: log.date.toISOString().split("T")[0],
    exercises: log.setLogs.map((set) => ({
      exerciseName: set.exerciseName,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
    })),
  }));

  return (
    <QuickPlanner
      client={{
        id: client.id,
        name: client.user.name,
      }}
      initialPlanDays={clientPlanDays}
      workoutLogs={workoutLogsData}
    />
  );
}
