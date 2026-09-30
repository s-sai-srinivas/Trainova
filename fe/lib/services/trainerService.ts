import prisma from "@/lib/db";

export async function updateTrainerProfile(
  userId: string,
  businessName: string,
  instagramHandle: string,
  coachingType: string
) {
  try {
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: userId },
    });
    if (!trainerProfile) {
      return { success: false, error: "Trainer profile not found." };
    }

    await prisma.trainerProfile.update({
      where: { id: trainerProfile.id },
      data: {
        businessName,
        instagramHandle,
        coachingType,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update trainer profile:", error);
    return { success: false, error: "Failed to update profile settings in database." };
  }
}
