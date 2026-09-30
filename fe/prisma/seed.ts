import { Goal, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { BASELINE_EXERCISES } from "../lib/baselineExercises";

const prisma = new PrismaClient();

function utcDay(offsetDays: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetDays, 0, 0, 0, 0));
}

async function main() {
  console.log("Cleaning and seeding Trainova with demo coach + clients...");

  await prisma.session.deleteMany({});
  await prisma.aIHealthScore.deleteMany({});
  await prisma.progressPhotoSet.deleteMany({});
  await prisma.mealLog.deleteMany({});
  await prisma.setLog.deleteMany({});
  await prisma.workoutLog.deleteMany({});
  await prisma.dailyCheckIn.deleteMany({});
  await prisma.planExercise.deleteMany({});
  await prisma.planWorkoutDay.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.exercise.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.trainerProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = hashPassword("password123");

  const trainerUser = await prisma.user.create({
    data: {
      name: "Coach Karan",
      phone: "+919876543210",
      email: "coach@trainova.com",
      role: Role.TRAINER,
      passwordHash,
      trainerProfile: {
        create: {
          businessName: "Karan Strength Lab",
          instagramHandle: "@karan.strength",
          coachingType: "Online + Hybrid",
        },
      },
    },
    include: { trainerProfile: true },
  });
  const trainerId = trainerUser.trainerProfile!.id;

  await prisma.user.create({
    data: {
      name: "Coach Priya",
      phone: "+919876543211",
      email: "priya@trainova.com",
      role: Role.TRAINER,
      passwordHash,
      trainerProfile: { create: { businessName: "Priya Fit" } },
    },
  });

  const extraExercises = [
    {
      name: "Romanian Deadlift",
      instructions: "Hinge at hips, keep bar close, soft knees, squeeze glutes at top.",
      muscleGroup: "Posterior Chain",
      equipmentType: "Barbell",
      difficulty: "Intermediate",
    },
    {
      name: "Seated Cable Row",
      instructions: "Pull handle to lower ribs, squeeze scapulae, control the return.",
      muscleGroup: "Back",
      equipmentType: "Cable",
      difficulty: "Beginner",
    },
    {
      name: "Overhead Press",
      instructions: "Press bar overhead, lock out, lower under control to clavicle.",
      muscleGroup: "Shoulders",
      equipmentType: "Barbell",
      difficulty: "Intermediate",
    },
    {
      name: "Walking Lunge",
      instructions: "Step forward, drop back knee, drive through front heel.",
      muscleGroup: "Legs",
      equipmentType: "Dumbbell",
      difficulty: "Beginner",
    },
  ];

  await prisma.exercise.createMany({
    data: [...BASELINE_EXERCISES, ...extraExercises].map((ex) => ({
      trainerId,
      name: ex.name,
      instructions: ex.instructions,
      muscleGroup: ex.muscleGroup,
      equipmentType: ex.equipmentType,
      difficulty: ex.difficulty,
      archived: false,
    })),
  });

  const exercises = await prisma.exercise.findMany({ where: { trainerId } });
  const byName = (name: string) => exercises.find((e) => e.name.toLowerCase() === name.toLowerCase())!;

  const bench = byName("Barbell Bench Press");
  const squat = byName("Barbell Full Squat");
  const lat = byName("Lat Pulldown");
  const rdl = byName("Romanian Deadlift");
  const row = byName("Seated Cable Row");
  const ohp = byName("Overhead Press");
  const lunge = byName("Walking Lunge");
  const chestPress = byName("Chest Press");

  const masterPlan = await prisma.plan.create({
    data: {
      trainerId,
      name: "Hypertrophy Push/Pull/Legs",
      description: "3-day hypertrophy base with progressive overload.",
      workoutDays: {
        create: [
          {
            dayNumber: 1,
            name: "Day 1: Push A",
            exercises: {
              create: [
                { exerciseId: bench.id, sets: 4, repsRange: "8-10", restSeconds: 90, targetWeight: 70, rpeTarget: 8 },
                { exerciseId: ohp.id, sets: 3, repsRange: "8-10", restSeconds: 90, targetWeight: 40, rpeTarget: 7 },
                { exerciseId: chestPress.id, sets: 3, repsRange: "10-12", restSeconds: 75, targetWeight: 45, rpeTarget: 7 },
              ],
            },
          },
          {
            dayNumber: 2,
            name: "Day 2: Pull A",
            exercises: {
              create: [
                { exerciseId: lat.id, sets: 4, repsRange: "10-12", restSeconds: 90, targetWeight: 50, rpeTarget: 8 },
                { exerciseId: row.id, sets: 3, repsRange: "10-12", restSeconds: 90, targetWeight: 45, rpeTarget: 7 },
                { exerciseId: rdl.id, sets: 3, repsRange: "8-10", restSeconds: 120, targetWeight: 80, rpeTarget: 8 },
              ],
            },
          },
          {
            dayNumber: 3,
            name: "Day 3: Legs A",
            exercises: {
              create: [
                { exerciseId: squat.id, sets: 4, repsRange: "6-8", restSeconds: 120, targetWeight: 90, rpeTarget: 8 },
                { exerciseId: lunge.id, sets: 3, repsRange: "10/leg", restSeconds: 90, targetWeight: 20, rpeTarget: 7 },
                { exerciseId: rdl.id, sets: 3, repsRange: "8-10", restSeconds: 120, targetWeight: 70, rpeTarget: 7 },
              ],
            },
          },
        ],
      },
    },
    include: { workoutDays: { include: { exercises: true } } },
  });

  const clientsSeed = [
    {
      name: "Amit Patel",
      phone: "+919876540001",
      email: "amit@trainova.com",
      goal: Goal.FAT_LOSS,
      age: 29,
      height: 175,
      weightTarget: 72,
      startWeight: 78.4,
      calorieTarget: 2000,
      proteinTarget: 160,
      stepTarget: 10000,
      gymAccess: "Commercial Gym",
      experienceLevel: "Intermediate",
      injuries: null as string | null,
      adherence: 0.85,
      active: true,
    },
    {
      name: "Sneha Reddy",
      phone: "+919876540002",
      email: "sneha@trainova.com",
      goal: Goal.MUSCLE_GAIN,
      age: 26,
      height: 162,
      weightTarget: 58,
      startWeight: 54.2,
      calorieTarget: 2300,
      proteinTarget: 140,
      stepTarget: 8000,
      gymAccess: "Commercial Gym",
      experienceLevel: "Beginner",
      injuries: "Mild left knee discomfort",
      adherence: 0.7,
      active: true,
    },
    {
      name: "Rahul Mehta",
      phone: "+919876540003",
      email: "rahul@trainova.com",
      goal: Goal.STRENGTH,
      age: 34,
      height: 180,
      weightTarget: 85,
      startWeight: 82.0,
      calorieTarget: 2800,
      proteinTarget: 180,
      stepTarget: 7000,
      gymAccess: "Home Gym",
      experienceLevel: "Advanced",
      injuries: null,
      adherence: 0.9,
      active: true,
    },
    {
      name: "Divya Nair",
      phone: "+919876540004",
      email: "divya@trainova.com",
      goal: Goal.MAINTENANCE,
      age: 31,
      height: 168,
      weightTarget: 62,
      startWeight: 63.1,
      calorieTarget: 2100,
      proteinTarget: 130,
      stepTarget: 9000,
      gymAccess: "Commercial Gym",
      experienceLevel: "Intermediate",
      injuries: null,
      adherence: 0.55,
      active: false, // quieter last week → alert signal
    },
  ];

  for (const c of clientsSeed) {
    const customPlan = await prisma.plan.create({
      data: {
        trainerId,
        name: `${c.name} - Custom Plan`,
        description: `Personalized clone for ${c.name}`,
        workoutDays: {
          create: masterPlan.workoutDays.map((day) => ({
            dayNumber: day.dayNumber,
            name: day.name,
            exercises: {
              create: day.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets,
                repsRange: ex.repsRange,
                restSeconds: ex.restSeconds,
                targetWeight: ex.targetWeight * (c.goal === Goal.STRENGTH ? 1.1 : c.goal === Goal.MUSCLE_GAIN ? 0.9 : 0.95),
                rpeTarget: ex.rpeTarget,
              })),
            },
          })),
        },
      },
      include: { workoutDays: { include: { exercises: { include: { exercise: true } } } } },
    });

    const user = await prisma.user.create({
      data: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        role: Role.CLIENT,
        passwordHash,
        clientProfile: {
          create: {
            trainerId,
            goal: c.goal,
            age: c.age,
            height: c.height,
            weightTarget: c.weightTarget,
            calorieTarget: c.calorieTarget,
            proteinTarget: c.proteinTarget,
            carbsTarget: Math.round(c.calorieTarget * 0.4 / 4),
            fatsTarget: Math.round(c.calorieTarget * 0.25 / 9),
            stepTarget: c.stepTarget,
            gymAccess: c.gymAccess,
            experienceLevel: c.experienceLevel,
            injuries: c.injuries,
            currentPlanId: customPlan.id,
            createdAt: utcDay(21),
          },
        },
      },
      include: { clientProfile: true },
    });

    const clientId = user.clientProfile!.id;
    const days = customPlan.workoutDays;

    // 14 days of check-ins
    for (let d = 13; d >= 0; d--) {
      if (!c.active && d < 6) continue; // Divya missed recent week
      const date = utcDay(d);
      const weightDrift = (13 - d) * (c.goal === Goal.FAT_LOSS ? -0.12 : c.goal === Goal.MUSCLE_GAIN ? 0.08 : 0.02);
      const adhered = Math.random() < c.adherence;
      await prisma.dailyCheckIn.create({
        data: {
          clientProfileId: clientId,
          date,
          weight: Math.round((c.startWeight + weightDrift + (Math.random() * 0.3 - 0.15)) * 10) / 10,
          sleepHours: Math.round((6.2 + Math.random() * 2) * 10) / 10,
          energyScore: 5 + Math.floor(Math.random() * 5),
          dietAdherence: adhered,
          stepsLogged: Math.round(c.stepTarget * (0.7 + Math.random() * 0.4)),
          targetCaloriesSnapped: c.calorieTarget,
          targetProteinSnapped: c.proteinTarget,
          targetStepsSnapped: c.stepTarget,
          notes: adhered ? "Felt solid." : "Travel day / late work.",
        },
      });
    }

    // Workout logs: last ~10 days, alternating plan days
    const workoutOffsets = c.active ? [1, 2, 4, 5, 7, 9, 11, 12] : [10, 12, 14];
    for (let i = 0; i < workoutOffsets.length; i++) {
      const day = days[i % days.length];
      const date = utcDay(workoutOffsets[i]);
      await prisma.workoutLog.create({
        data: {
          clientProfileId: clientId,
          planWorkoutDayId: day.id,
          date,
          notes: i % 3 === 0 ? "Hit most targets." : null,
          setLogs: {
            create: day.exercises.flatMap((ex) =>
              Array.from({ length: Math.min(ex.sets, 3) }, (_, setIdx) => {
                const hit = Math.random() < c.adherence;
                const targetReps = parseInt(ex.repsRange, 10) || 8;
                return {
                  setNumber: setIdx + 1,
                  exerciseName: ex.exercise.name,
                  targetWeight: ex.targetWeight,
                  targetReps,
                  weight: hit ? ex.targetWeight : Math.round(ex.targetWeight * 0.9 * 2) / 2,
                  reps: hit ? targetReps : Math.max(4, targetReps - 2),
                };
              })
            ),
          },
        },
      });
    }

    // A few meal logs
    const meals = [
      { name: "Chicken rice bowl", calories: 620, protein: 48, carbs: 55, fats: 18 },
      { name: "Greek yogurt + fruit", calories: 280, protein: 22, carbs: 30, fats: 6 },
      { name: "Paneer wrap", calories: 540, protein: 32, carbs: 48, fats: 22 },
    ];
    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      await prisma.mealLog.create({
        data: {
          clientProfileId: clientId,
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fats: m.fats,
          loggedAt: utcDay(i + 1),
          trainerFeedback: i === 0 ? "Solid protein hit — keep this lunch." : null,
          feedbackAt: i === 0 ? utcDay(i) : null,
        },
      });
    }

    await prisma.aIHealthScore.create({
      data: {
        clientProfileId: clientId,
        date: utcDay(0),
        healthScore: c.active ? (c.adherence > 0.8 ? 92 : 78) : 58,
        riskScore: c.active ? (c.adherence > 0.8 ? 12 : 35) : 70,
        recommendation: c.active
          ? `${c.name} is tracking well. Keep progressive overload on ${days[0].name}.`
          : `${c.name} has missed recent sessions — send a check-in message.`,
      },
    });

    console.log(`Seeded client ${c.name} (${c.phone}) / password123`);
  }

  // Strength-focused second master template
  await prisma.plan.create({
    data: {
      trainerId,
      name: "Strength Foundation 3x",
      description: "Lower volume, heavier compound focus.",
      workoutDays: {
        create: [
          {
            dayNumber: 1,
            name: "Strength A — Squat Focus",
            exercises: {
              create: [
                { exerciseId: squat.id, sets: 5, repsRange: "3-5", restSeconds: 180, targetWeight: 100, rpeTarget: 8 },
                { exerciseId: lunge.id, sets: 3, repsRange: "8/leg", restSeconds: 120, targetWeight: 24, rpeTarget: 7 },
              ],
            },
          },
          {
            dayNumber: 2,
            name: "Strength B — Press Focus",
            exercises: {
              create: [
                { exerciseId: bench.id, sets: 5, repsRange: "3-5", restSeconds: 180, targetWeight: 80, rpeTarget: 8 },
                { exerciseId: ohp.id, sets: 4, repsRange: "5-6", restSeconds: 150, targetWeight: 45, rpeTarget: 8 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("\nDone.");
  console.log("Coach login:  +919876543210 / password123");
  console.log("Athlete logins (all password123):");
  for (const c of clientsSeed) {
    console.log(`  ${c.name}: ${c.phone} or ${c.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
