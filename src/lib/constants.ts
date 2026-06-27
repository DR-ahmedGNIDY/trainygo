/**
 * Shared enums & constants for Trainygo.
 * Kept framework-agnostic so they can be imported on client and server.
 */

export const USER_ROLES = ["super_admin", "coach", "client"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "trial",
  "active",
  "expired",
  "suspended",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "expired",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_METHODS = ["vodafone_cash", "instapay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PLAN_TIERS = ["starter", "pro", "enterprise"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const EXERCISE_CATEGORIES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "abs",
  "cardio",
  "swimming",
  "stretching",
  "rehabilitation",
  "full_body",
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const FOOD_CATEGORIES = [
  "protein",
  "carbs",
  "vegetables",
  "fruits",
  "healthy_fats",
  "drinks",
  "dairy",
  "snacks",
  "fast_food",
  "supplements",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_UNITS = ["100g", "piece", "cup", "spoon"] as const;
export type FoodUnit = (typeof FOOD_UNITS)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const CLIENT_GOALS = [
  "fat_loss",
  "muscle_gain",
  "maintenance",
  "strength",
  "general_fitness",
  "rehabilitation",
] as const;
export type ClientGoal = (typeof CLIENT_GOALS)[number];

export const NOTIFICATION_TYPES = [
  "new_client",
  "new_checkin",
  "new_message",
  "subscription_expiry",
  "new_program",
  "new_nutrition_plan",
  "subscription_activated",
  "workout_report",
  "personal_record",
  "performance_decline",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TRIAL_DURATION_DAYS = 3;

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
