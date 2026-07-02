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

export const PLAN_TIERS = [
  "starter_10",
  "growth_20",
  "professional_30",
  "quarterly_starter",
  "quarterly_growth",
  "quarterly_professional",
] as const;
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
  "muscle_building",
  "fat_loss",
  "athletic_conditioning",
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

export const TRIAL_DURATION_DAYS = 7;

/** Arabic-speaking countries offered in coach registration, with phone dial codes. */
export const ARAB_COUNTRIES = [
  { value: "EG", flag: "🇪🇬", ar: "مصر", en: "Egypt", dialCode: "+20" },
  { value: "SA", flag: "🇸🇦", ar: "السعودية", en: "Saudi Arabia", dialCode: "+966" },
  { value: "KW", flag: "🇰🇼", ar: "الكويت", en: "Kuwait", dialCode: "+965" },
  { value: "QA", flag: "🇶🇦", ar: "قطر", en: "Qatar", dialCode: "+974" },
  { value: "AE", flag: "🇦🇪", ar: "الإمارات", en: "United Arab Emirates", dialCode: "+971" },
  { value: "BH", flag: "🇧🇭", ar: "البحرين", en: "Bahrain", dialCode: "+973" },
  { value: "OM", flag: "🇴🇲", ar: "عمان", en: "Oman", dialCode: "+968" },
  { value: "JO", flag: "🇯🇴", ar: "الأردن", en: "Jordan", dialCode: "+962" },
  { value: "IQ", flag: "🇮🇶", ar: "العراق", en: "Iraq", dialCode: "+964" },
  { value: "LB", flag: "🇱🇧", ar: "لبنان", en: "Lebanon", dialCode: "+961" },
  { value: "SY", flag: "🇸🇾", ar: "سوريا", en: "Syria", dialCode: "+963" },
  { value: "PS", flag: "🇵🇸", ar: "فلسطين", en: "Palestine", dialCode: "+970" },
  { value: "LY", flag: "🇱🇾", ar: "ليبيا", en: "Libya", dialCode: "+218" },
  { value: "DZ", flag: "🇩🇿", ar: "الجزائر", en: "Algeria", dialCode: "+213" },
  { value: "TN", flag: "🇹🇳", ar: "تونس", en: "Tunisia", dialCode: "+216" },
  { value: "MA", flag: "🇲🇦", ar: "المغرب", en: "Morocco", dialCode: "+212" },
  { value: "YE", flag: "🇾🇪", ar: "اليمن", en: "Yemen", dialCode: "+967" },
  { value: "SD", flag: "🇸🇩", ar: "السودان", en: "Sudan", dialCode: "+249" },
  { value: "MR", flag: "🇲🇷", ar: "موريتانيا", en: "Mauritania", dialCode: "+222" },
] as const;

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
