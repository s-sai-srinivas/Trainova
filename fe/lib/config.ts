export const APP_CONFIG = {
  // Branding
  BRAND_NAME: "Trainova",

  // Public origin for invite links (prefer env over request Host)
  APP_URL: (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, ""),

  // Session
  SESSION_EXPIRY_DAYS: 7,
  INVITE_EXPIRY_HOURS: 48,
  MEAL_LOG_RETENTION_DAYS: 30,

  // Defaults for client onboarding
  DEFAULT_CALORIE_TARGET: 2000,
  DEFAULT_PROTEIN_TARGET: 140,
  DEFAULT_CARBS_TARGET: 200,
  DEFAULT_FATS_TARGET: 60,
  DEFAULT_STEP_TARGET: 10000,

  // Fallback values
  DEFAULT_WEIGHT_FALLBACK: 75.0,
  DEFAULT_WORKOUT_NOTES: "Logged on athlete terminal.",

  // AI Health Scores
  AI_SCORE_MISSED_SETS: 75,
  AI_SCORE_DEFAULT: 94,
  AI_RISK_MISSED_SETS: 35,
  AI_RISK_DEFAULT: 10,
  AI_APPROVAL_HEALTH: 90,
  AI_APPROVAL_RISK: 10,
  RESOLVED_ALERT_HEALTH: 100,
  RESOLVED_ALERT_RISK: 0,

  // Thresholds
  SLEEP_TARGET_HOURS: 7,
  ENERGY_HIGH_THRESHOLD: 7,
  DIET_GOAL_PERCENTAGE: 80,

  // Uploads
  MAX_VIDEO_UPLOAD_MB: 50,

  // Validation limits
  MAX_CALORIE_TARGET: 10000,
  MAX_STEP_TARGET: 100000,
  MIN_PASSWORD_LENGTH: 8,

  // UI
  AUTO_SAVE_DEBOUNCE_MS: 2000,
  MODAL_BACKDROP_OPACITY: 0.7,
} as const;

export const WORKOUT_DEFAULTS = {
  DAY_NAMES: ["Day 1: Push A", "Day 2: Pull A", "Day 3: Legs A"],
  REST_SECONDS: 90,
  DEFAULT_TARGET_WEIGHT: 60.0,
} as const;
