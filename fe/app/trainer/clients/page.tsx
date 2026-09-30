import prisma from "@/lib/db";
import ClientRoster from "@/components/ClientRoster";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { daysDiff } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function TrainerClients() {
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

  const today = new Date();

  // 1. Fetch all clients from database with足够的data to compute compliance/alerts
  const clients = await prisma.clientProfile.findMany({
    where: { trainerId: trainerProfile.id },
    include: {
      user: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 20,
      },
      workoutLogs: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  // 2. Map profiles to fit components with dynamic compliance/alert calculation
  const mappedClients = clients.map((client) => {
    const user = client.user;
    const lastCheckin = client.checkIns[0];
    const lastLogDate = lastCheckin 
      ? new Date(lastCheckin.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) 
      : "No Log";

    // Calculate compliance dynamically from diet adherence
    const totalCheckIns = client.checkIns.length;
    const compliantCheckIns = client.checkIns.filter((c) => c.dietAdherence).length;
    const compliance = totalCheckIns > 0 ? Math.round((compliantCheckIns / totalCheckIns) * 100) : 100;

    // Determine alert type dynamically
    let alertType: "RED" | "YELLOW" | "GREEN" = "GREEN";

    const latestWeightCheckIn = client.checkIns.find((c) => c.weight !== null);
    const daysSinceLastWeight = latestWeightCheckIn ? daysDiff(today, new Date(latestWeightCheckIn.date)) : null;

    const latestWorkout = client.workoutLogs[0];
    const daysSinceLastWorkout = latestWorkout ? daysDiff(today, new Date(latestWorkout.date)) : null;

    // Weight plateau detection
    const weightLogs = client.checkIns.filter((c) => c.weight !== null).map((c) => c.weight as number);
    let isPlateau = false;
    if (weightLogs.length >= 5) {
      const slice = weightLogs.slice(0, 14);
      const diff = Math.max(...slice) - Math.min(...slice);
      if (diff <= 0.3 && (client.goal === "FAT_LOSS" || client.goal === "MUSCLE_GAIN")) {
        isPlateau = true;
      }
    }

    const daysSinceCreated = daysDiff(today, new Date(client.createdAt));
    const neverWorkedOutAndStale = daysSinceLastWorkout === null && daysSinceCreated >= 5;
    if ((daysSinceLastWeight !== null && daysSinceLastWeight >= 5) ||
        (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 5) ||
        neverWorkedOutAndStale) {
      alertType = "RED";
    } else if (isPlateau || compliance < 80) {
      alertType = "YELLOW";
    }

    return {
      id: client.id,
      name: user.name,
      phone: user.phone,
      goal: client.goal.toString(),
      compliance,
      lastLogDate,
      alertType,
    };
  });

  return (
    <div className="flex-col gap-md">
      <h1 className="text-heading" style={{ fontSize: "24px" }}>Clients Directory</h1>
      <ClientRoster initialClients={mappedClients} />
    </div>
  );
}
