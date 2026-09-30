export interface CheckIn {
  id?: string;
  date: string;
  weight: number | null;
  sleepHours: number | null;
  energyScore: number | null;
  dietAdherence: boolean;
  stepsLogged?: number | null;
}

export interface WorkoutLogData {
  date: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  targetWeight: number;
  targetReps: number;
  workoutDayName?: string;
}

export interface PhotoSet {
  date: string;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  equipmentType: string;
  coachingCue: string;
  instructions?: string;
  difficulty?: string;
  videoMain?: string | null;
  videoSide?: string | null;
  videoMistakes?: string | null;
  tags?: string | null;
  archived?: boolean;
  catalogId?: string | null;
  gifUrl?: string | null;
  thumbnailUrl?: string | null;
  steps?: string[];
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  catalogId?: string | null;
  name: string;
  sets: number;
  repsRange?: string;
  weight?: number | string;
  supersetLabel?: string;
  coachingNote?: string;
  restSeconds?: number;
  coachingCue?: string;
  gifUrl?: string | null;
  thumbnailUrl?: string | null;
  steps?: string[];
}

export interface PlanDay {
  id: string;
  name: string;
  dayNumber: number;
  scheduledDate?: string | null;
  exercises: PlannedExercise[];
}

export interface ClientProfileData {
  id: string;
  name: string;
  phone: string;
  goal: string;
  calorieTarget: number;
  stepTarget: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatsTarget?: number;
  aiSummary: string;
  currentPlanId?: string | null;
  currentPlanName?: string | null;
  completedSessionsCount: number;
  createdAt: string;
  age?: number | null;
  injuries?: string | null;
  experienceLevel?: string | null;
  gymAccess?: string | null;
  weightTarget?: number | null;
}

export interface MealLogData {
  id: string;
  clientProfileId?: string;
  name: string;
  imageUrl: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  loggedAt: string | Date;
  trainerFeedback: string | null;
  feedbackAt: string | Date | null;
}
