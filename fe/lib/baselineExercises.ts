/** Shared starter catalog copied onto each new trainer (and used by seed). */
export const BASELINE_EXERCISES = [
  {
    name: "Barbell Bench Press",
    instructions:
      "1. Lie flat on a bench.\n2. Grip the barbell slightly wider than shoulder-width.\n3. Lower the bar to chest under control, then press up.",
    muscleGroup: "Chest",
    equipmentType: "Barbell",
    difficulty: "Intermediate",
  },
  {
    name: "Barbell Full Squat",
    instructions:
      "1. Position bar on upper back.\n2. Squat down by bending hips and knees until thighs are below parallel.\n3. Return to standing position.",
    muscleGroup: "Legs",
    equipmentType: "Barbell",
    difficulty: "Intermediate",
  },
  {
    name: "Lat Pulldown",
    instructions:
      "1. Sit at a pull-down station.\n2. Pull the bar down to collarbone level.\n3. Slowly return bar to starting position.",
    muscleGroup: "Back",
    equipmentType: "Machine",
    difficulty: "Intermediate",
  },
  {
    name: "Chest Press",
    instructions:
      "1. Sit at chest press machine.\n2. Push handles forward fully.\n3. Controlled return to starting position.",
    muscleGroup: "Chest",
    equipmentType: "Machine",
    difficulty: "Beginner",
  },
  {
    name: "Barbell Back Squat",
    instructions: "1. Stand with feet shoulder width.\n2. Lower hips under control.\n3. Stand back up.",
    muscleGroup: "Legs",
    equipmentType: "Barbell",
    difficulty: "Intermediate",
  },
] as const;
