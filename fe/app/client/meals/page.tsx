import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import MealsWorkspace from "./MealsWorkspace";

export const dynamic = "force-dynamic";

export default async function ClientMealsPage() {
  const session = await getSession();

  if (!session || session.role !== "CLIENT") {
    redirect("/login");
  }

  // Fetch client profile and meal logs (which handles auto-cleanup under the hood)
  const client = await prisma.clientProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      mealLogs: {
        orderBy: { loggedAt: "desc" },
      },
    },
  });

  if (!client) {
    redirect("/login");
  }

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
    <MealsWorkspace 
      client={{
        id: client.id,
        name: client.user.name,
        calorieTarget: client.calorieTarget,
        proteinTarget: client.proteinTarget,
        carbsTarget: client.carbsTarget,
        fatsTarget: client.fatsTarget,
      }}
      initialMealLogs={mealLogs}
    />
  );
}
