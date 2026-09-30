import prisma from "@/lib/db";
import PlanBuilder from "@/components/PlanBuilder";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { mapPlannedExercise } from "@/lib/planMapping";

export const dynamic = "force-dynamic";

interface PlanDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TrainerPlanDetailPage({ params }: PlanDetailPageProps) {
  const session = await getSession();
  if (!session || session.role !== "TRAINER") redirect("/login");

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!trainerProfile) redirect("/login");

  const { id } = await params;

  const plan = await prisma.plan.findFirst({
    where: { id, trainerId: trainerProfile.id },
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
  });

  if (!plan) {
    notFound();
  }

  const exerciseLibrary = await prisma.exercise.findMany({
    where: { trainerId: trainerProfile.id },
    orderBy: { name: "asc" },
  });

  const initialDays = plan.workoutDays.map((day) => ({
    id: day.id,
    name: day.name,
    dayNumber: day.dayNumber,
    exercises: day.exercises.map((ex) => mapPlannedExercise(ex)),
  }));

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

  return (
    <div className="flex-col gap-md">
      <div className="flex-col gap-sm" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "16px" }}>
        <h1 className="text-heading" style={{ fontSize: "24px" }}>Edit Program Template</h1>
        <span style={{ fontSize: "16px", fontWeight: 700 }}>{plan.name}</span>
        {plan.description && (
          <span style={{ fontSize: "13px", color: "var(--accent-muted)" }}>{plan.description}</span>
        )}
      </div>

      <PlanBuilder
        initialDays={initialDays}
        exerciseLibrary={formattedLibrary}
        isMasterTemplate={true}
        planId={id}
      />
    </div>
  );
}
