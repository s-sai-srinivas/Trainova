import prisma from "@/lib/db";
import { signJWT } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { APP_CONFIG } from "@/lib/config";
import { BASELINE_EXERCISES } from "@/lib/baselineExercises";

async function pruneExpiredSessions(userId?: string) {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      ...(userId ? { userId } : {}),
    },
  });
}

async function createSession(userId: string, role: string, name: string) {
  await pruneExpiredSessions(userId);

  const token = await signJWT({ userId, role, name });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + APP_CONFIG.SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return { token, expiresAt };
}

async function loginUser(identifier: string, password: string, role: "TRAINER" | "CLIENT") {
  try {
    const cleanIdentifier = identifier.trim();
    const cleanPhone = cleanIdentifier.replace(/[\s\-\(\)]/g, "");
    const cleanEmail = cleanIdentifier.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        role,
        OR: [
          { phone: cleanIdentifier },
          { phone: cleanPhone },
          { email: cleanEmail },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: "Invalid email/phone number or password." };
    }

    const isPasswordCorrect = verifyPassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return { success: false, error: "Invalid email/phone number or password." };
    }

    const { token, expiresAt } = await createSession(user.id, user.role, user.name);
    return { success: true, token, expiresAt };
  } catch (error) {
    console.error(`${role} login failed:`, error);
    return { success: false, error: "Authentication system error." };
  }
}

export async function loginTrainer(identifier: string, password: string) {
  return loginUser(identifier, password, "TRAINER");
}

export async function loginClient(identifier: string, password: string) {
  return loginUser(identifier, password, "CLIENT");
}

export async function logout(token: string) {
  try {
    await prisma.session.deleteMany({ where: { token } });
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return { success: false, error: "Failed to log out cleanly." };
  }
}

export async function claimInvite(token: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: "Invalid email format" };
  }
  if (!password || password.length < APP_CONFIG.MIN_PASSWORD_LENGTH) {
    return { success: false, error: "Password must be at least 8 characters" };
  }
  try {
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail && existingEmail.inviteToken !== token) {
      return { success: false, error: "Email is already registered to another account." };
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return { success: false, error: "Invite token is invalid or has expired." };
    }

    const hash = hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        inviteToken: null,
        inviteExpires: null,
      },
    });

    const { token: sessionToken, expiresAt } = await createSession(user.id, user.role, user.name);
    return { success: true, token: sessionToken, expiresAt };
  } catch (error) {
    console.error("Failed to claim invite:", error);
    return { success: false, error: "Failed to claim account." };
  }
}

export async function registerTrainer(name: string, phone: string, password: string) {
  if (!name.trim()) {
    return { success: false, error: "Name is required." };
  }
  if (!phone.trim()) {
    return { success: false, error: "Phone number is required." };
  }
  if (!password || password.length < APP_CONFIG.MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters.` };
  }

  const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, "");

  try {
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      return { success: false, error: "Phone number is already registered." };
    }

    const hash = hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          phone: cleanPhone,
          role: "TRAINER",
          passwordHash: hash,
          trainerProfile: {
            create: {},
          },
        },
        include: { trainerProfile: true },
      });

      const trainerId = user.trainerProfile!.id;
      await tx.exercise.createMany({
        data: BASELINE_EXERCISES.map((ex) => ({
          trainerId,
          name: ex.name,
          instructions: ex.instructions,
          muscleGroup: ex.muscleGroup,
          equipmentType: ex.equipmentType,
          difficulty: ex.difficulty,
          archived: false,
        })),
      });

      return user;
    });

    const { token, expiresAt } = await createSession(newUser.id, newUser.role, newUser.name);
    return { success: true, token, expiresAt };
  } catch (error) {
    console.error("Trainer registration failed:", error);
    return { success: false, error: "Trainer registration system error." };
  }
}
