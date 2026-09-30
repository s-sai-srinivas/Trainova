import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import ClientProgressWorkspace from "./ClientProgressWorkspace";

export const dynamic = "force-dynamic";

export default async function ClientProgressPage() {
  const session = await getSession();

  if (!session || session.role !== "CLIENT") {
    redirect("/login");
  }

  const client = await prisma.clientProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 10,
      },
      progressPhotoSets: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!client) {
    redirect("/login");
  }

  // Format checkIns for charting (ordered asc for chronology)
  const formattedCheckIns = [...client.checkIns]
    .reverse()
    .map((c) => ({
      date: c.date.toISOString(),
      weight: c.weight,
    }))
    .filter((c) => c.weight !== null);

  const formattedPhotos = client.progressPhotoSets.map((p) => ({
    date: p.date.toISOString(),
    photoFrontUrl: p.photoFrontUrl,
    photoSideUrl: p.photoSideUrl,
  }));

  return (
    <ClientProgressWorkspace 
      clientId={client.id}
      clientName={client.user?.name || "Athlete"}
      checkIns={formattedCheckIns}
      photos={formattedPhotos}
    />
  );
}
