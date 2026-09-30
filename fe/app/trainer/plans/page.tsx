import prisma from "@/lib/db";
import PlanLibrary from "@/components/PlanLibrary";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrainerPlansIndex() {
  const session = await getSession();
  if (!session || session.role !== "TRAINER") {
    redirect("/login");
  }

  const trainerProfile = await prisma.trainerProfile.findFirst({
    where: { userId: session.userId },
  });
  if (!trainerProfile) {
    redirect("/login");
  }

  // 1. Fetch all templates (plans not assigned to specific custom clients)
  const plans = await prisma.plan.findMany({
    where: {
      trainerId: trainerProfile.id,
      NOT: {
        name: {
          contains: "- Custom Plan",
        },
      },
    },
    include: {
      workoutDays: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // 2. Map data
  const formattedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    workoutDaysCount: p.workoutDays.length,
  }));

  return (
    <div className="flex-col gap-md">
      <h1 className="text-heading" style={{ fontSize: "24px" }}>Program Library</h1>
      <PlanLibrary initialPlans={formattedPlans} />
    </div>
  );
}
