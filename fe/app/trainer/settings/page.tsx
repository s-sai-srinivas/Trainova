import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import TrainerSettingsForm from "@/components/TrainerSettingsForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TrainerSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "TRAINER") {
    redirect("/login");
  }

  // Fetch the current trainer profile
  const trainer = await prisma.trainerProfile.findFirst({
    where: { userId: session.userId },
    include: {
      user: true,
    },
  });

  if (!trainer) {
    notFound();
  }

  return (
    <div className="flex-col gap-md">
      <div className="flex-col gap-sm" style={{ borderBottom: "1px solid var(--border-frosted)", paddingBottom: "16px" }}>
        <h1 className="text-heading" style={{ fontSize: "24px" }}>Trainer Profile Settings</h1>
        <span style={{ fontSize: "14px", color: "var(--accent-muted)" }}>
          Set up your coaching system identity and brand integrations
        </span>
      </div>

      <TrainerSettingsForm
        initialData={{
          name: trainer.user.name,
          businessName: trainer.businessName || "",
          instagramHandle: trainer.instagramHandle || "",
          coachingType: trainer.coachingType || "Fat Loss",
        }}
      />
    </div>
  );
}
