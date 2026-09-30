import prisma from "@/lib/db";
import AlertFeed from "@/components/AlertFeed";
import { AlertCircle, Users, CheckCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { daysDiff } from "@/lib/utils/date";
import { alertTriggerKey } from "@/lib/services/clientService";

// Force dynamic rendering to load database changes reactively
export const dynamic = "force-dynamic";

function isToday(date: Date): boolean {
  const todayDate = new Date();
  return date.getDate() === todayDate.getDate() &&
         date.getMonth() === todayDate.getMonth() &&
         date.getFullYear() === todayDate.getFullYear();
}

export default async function TrainerDashboard() {
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

  // 1. Fetch clients with profile information, health scores, check-ins, and workout logs
  const clientProfiles = await prisma.clientProfile.findMany({
    where: { trainerId: trainerProfile.id },
    include: {
      user: true,
      healthScores: {
        orderBy: { date: "desc" },
        take: 1,
      },
      checkIns: {
        orderBy: { date: "desc" },
        take: 20, // Check up to 20 days for plateauing weight
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

  // 2. Map profiles to alert models based on dynamic metrics
  const alerts = clientProfiles.map((client) => {
    const score = client.healthScores[0];
    const user = client.user;
    
    let alertType: "RED" | "YELLOW" | "GREEN" = "GREEN";
    const triggers: string[] = [];
    let aiMessage = "";

    // A. Check-in & Weight latency
    const latestWeightCheckIn = client.checkIns.find((c) => c.weight !== null);
    const daysSinceLastWeight = latestWeightCheckIn ? daysDiff(today, new Date(latestWeightCheckIn.date)) : null;

    // B. Workout latency
    const latestWorkout = client.workoutLogs[0];
    const daysSinceLastWorkout = latestWorkout ? daysDiff(today, new Date(latestWorkout.date)) : null;

    // C. Diet compliance rate
    const totalCheckIns = client.checkIns.length;
    const compliantCheckIns = client.checkIns.filter((c) => c.dietAdherence).length;
    const complianceRate = totalCheckIns > 0 ? Math.round((compliantCheckIns / totalCheckIns) * 100) : 100;

    // D. Weight plateau detection
    const weightLogs = client.checkIns.filter((c) => c.weight !== null).map((c) => c.weight as number);
    let isPlateau = false;
    let avgWeight = 0;
    if (weightLogs.length >= 5) {
      const slice = weightLogs.slice(0, 14);
      const maxW = Math.max(...slice);
      const minW = Math.min(...slice);
      const diff = maxW - minW;
      avgWeight = Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
      if (diff <= 0.3 && (client.goal === "FAT_LOSS" || client.goal === "MUSCLE_GAIN")) {
        isPlateau = true;
      }
    }

    // E. Overload target / PR detection
    let prFound = false;
    let prDetail = "";
    if (latestWorkout && latestWorkout.setLogs.length > 0) {
      const prSet = latestWorkout.setLogs.find((s) => s.weight >= s.targetWeight && s.reps >= s.targetReps);
      if (prSet) {
        prFound = true;
        prDetail = `${prSet.exerciseName} at ${prSet.weight}kg`;
      }
    }

    // F. Classify Alert Level & Triggers
    if (daysSinceLastWeight !== null && daysSinceLastWeight >= 5) {
      alertType = "RED";
      triggers.push(`weight unlogged ${daysSinceLastWeight} days`);
    }

    if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 5) {
      alertType = "RED";
      const missedCount = Math.max(1, Math.floor(daysSinceLastWorkout / 2.5));
      triggers.push(`missed ${missedCount} workouts (${daysSinceLastWorkout} days since last session)`);
    } else if (daysSinceLastWorkout === null) {
      const daysSinceCreated = daysDiff(today, new Date(client.createdAt));
      if (daysSinceCreated >= 5) {
        alertType = "RED";
        triggers.push("no workouts logged yet");
      }
    }

    if (alertType !== "RED") {
      if (isPlateau) {
        alertType = "YELLOW";
        triggers.push(`weight plateaued at ${avgWeight}kg`);
      }
      if (complianceRate < 80) {
        alertType = "YELLOW";
        triggers.push(`diet compliance dropped to ${complianceRate}%`);
      }
    }

    if (alertType !== "RED" && alertType !== "YELLOW") {
      alertType = "GREEN";
      if (prFound) {
        triggers.push(`hit progressive overload PR: ${prDetail}`);
      }
      triggers.push(`${complianceRate}% compliance hit`);
    }

    // G. Generate custom draft messages
    const firstName = user.name.split(" ")[0];
    if (alertType === "RED") {
      const triggerMsg = triggers.join(" & ");
      aiMessage = `Hey ${firstName}, I noticed you missed some items (${triggerMsg}). Are you feeling okay, or do we need to simplify the plan? Let me know so we can adjust.`;
    } else if (alertType === "YELLOW") {
      if (isPlateau) {
        aiMessage = `Hi ${firstName}, I reviewed your logs and noticed your weight has static-plateaued around ${avgWeight}kg. Let's adjust target calories to break this plateau.`;
      } else {
        aiMessage = `Hey ${firstName}, let's monitor targets. Your adherence has dropped to ${complianceRate}%, we might need a small adjustment to keep you on track!`;
      }
    } else {
      if (prFound) {
        aiMessage = `Outstanding job ${firstName}! You hit your overload target on ${prDetail}. Compliance is perfect at ${complianceRate}%. Keep pushing!`;
      } else {
        aiMessage = `Excellent work ${firstName}! Great consistency this week with ${complianceRate}% compliance.`;
      }
    }

    const healthScore = score?.healthScore ?? (alertType === "RED" ? 50 : alertType === "YELLOW" ? 75 : 100);
    const riskScore = score?.riskScore ?? (alertType === "RED" ? 75 : alertType === "YELLOW" ? 35 : 10);
    const recommendation = score?.recommendation ?? (
      alertType === "RED" ? "Schedule a 1-on-1 recovery review immediately." :
      alertType === "YELLOW" ? "Monitor daily weigh-ins and calorie targets." :
      "Continue progressive overload model."
    );

    const triggerKey = alertTriggerKey(alertType, triggers);
    return {
      id: client.id,
      name: user.name,
      phone: user.phone,
      goal: client.goal.toString(),
      calorieTarget: client.calorieTarget,
      stepTarget: client.stepTarget,
      healthScore,
      riskScore,
      recommendation,
      alertType,
      triggers,
      aiMessage,
      triggerKey,
      dismissedKey: client.alertDismissedKey,
    };
  });

  const sortedAlerts = alerts
    .filter((a) => {
      if (a.alertType === "GREEN") return false;
      if (a.dismissedKey && a.dismissedKey === a.triggerKey) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { RED: 0, YELLOW: 1, GREEN: 2 };
      return order[a.alertType] - order[b.alertType];
    });

  // Calculate summary stats
  const redAlertCount = alerts.filter((a) => a.alertType === "RED").length;
  const yellowAlertCount = alerts.filter((a) => a.alertType === "YELLOW").length;
  const totalAlerts = redAlertCount + yellowAlertCount;
  
  const activeClientsCount = clientProfiles.length;

  let totalComplianceSum = 0;
  clientProfiles.forEach((client) => {
    const totalCheckIns = client.checkIns.length;
    const compliantCheckIns = client.checkIns.filter((c) => c.dietAdherence).length;
    const clientCompliance = totalCheckIns > 0 ? (compliantCheckIns / totalCheckIns) * 100 : 100;
    totalComplianceSum += clientCompliance;
  });
  const averageCompliance = clientProfiles.length > 0 
    ? Math.round(totalComplianceSum / clientProfiles.length) 
    : 100;

  // 3. Construct dynamic action plan items
  const actionItems: { bold?: string; text: string }[] = [];

  alerts.forEach((c) => {
    if (c.alertType === "RED") {
      actionItems.push({
        bold: c.name,
        text: ` needs immediate follow-up (${c.triggers.join(", ")}).`
      });
    } else if (c.alertType === "YELLOW") {
      actionItems.push({
        bold: c.name,
        text: ` is plateauing (${c.triggers.join(", ")}).`
      });
    } else if (c.alertType === "GREEN" && c.triggers.some((t) => t.includes("overload") || t.includes("PR"))) {
      const prTrigger = c.triggers.find((t) => t.includes("overload") || t.includes("PR")) || "";
      const cleanedPR = prTrigger.replace("hit progressive overload PR: ", "");
      actionItems.push({
        bold: c.name,
        text: ` hit a new progressive overload PR: ${cleanedPR} with ${c.calorieTarget}kcal target compliance.`
      });
    }
  });

  // Today's general counts
  const pendingCheckInsCount = clientProfiles.filter((c) => 
    !c.checkIns.some((ci) => isToday(new Date(ci.date)))
  ).length;

  const missingWeightCount = clientProfiles.filter((c) => {
    const latestW = c.checkIns.find((ci) => ci.weight !== null);
    if (!latestW) return true;
    return daysDiff(today, new Date(latestW.date)) >= 5;
  }).length;

  if (clientProfiles.length > 0) {
    const checkInText = pendingCheckInsCount === 1 ? "1 client pending morning check-in" : `${pendingCheckInsCount} clients pending morning check-ins`;
    const weightText = missingWeightCount === 1 ? "1 client has not uploaded weight for 5 days" : `${missingWeightCount} clients have not uploaded weight for 5 days`;
    actionItems.push({
      text: `${checkInText}; ${weightText}.`
    });
  }

  return (
    <div className="flex-col gap-md">
      {/* Summary statistics banner */}
      <section 
        className="glass-card flex-row justify-between items-center" 
        style={{ padding: "12px 16px", backgroundColor: "var(--bg-surface-glass)" }}
      >
        <div className="flex-col items-center" style={{ flex: 1, borderRight: "1px solid var(--border-frosted)" }}>
          <span className="flex-row items-center gap-sm" style={{ color: "var(--status-red)", fontSize: "18px", fontWeight: 700 }}>
            <AlertCircle size={16} />
            {totalAlerts}
          </span>
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", textTransform: "uppercase", marginTop: "4px" }}>
            Alerts
          </span>
        </div>
        <div className="flex-col items-center" style={{ flex: 1, borderRight: "1px solid var(--border-frosted)" }}>
          <span className="flex-row items-center gap-sm" style={{ color: "var(--accent-white)", fontSize: "18px", fontWeight: 700 }}>
            <Users size={16} />
            {activeClientsCount}
          </span>
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", textTransform: "uppercase", marginTop: "4px" }}>
            Clients
          </span>
        </div>
        <div className="flex-col items-center" style={{ flex: 1 }}>
          <span className="flex-row items-center gap-sm" style={{ color: "var(--status-green)", fontSize: "18px", fontWeight: 700 }}>
            <CheckCircle size={16} />
            {averageCompliance}%
          </span>
          <span style={{ fontSize: "11px", color: "var(--accent-muted)", textTransform: "uppercase", marginTop: "4px" }}>
            Adherence
          </span>
        </div>
      </section>



      {/* Main Alert Feed list */}
      <section className="flex-col gap-sm">
        <h2 className="text-heading" style={{ fontSize: "18px", color: "var(--accent-muted)", marginBottom: "8px" }}>
          Attention Feed
        </h2>
        {sortedAlerts.length > 0 ? (
          <AlertFeed initialAlerts={sortedAlerts} />
        ) : (
          <div className="glass-card text-center" style={{ padding: "32px 16px", color: "var(--accent-muted)" }}>
            No one needs you right now. Reds and yellows show up here.
          </div>
        )}
      </section>
    </div>
  );
}
