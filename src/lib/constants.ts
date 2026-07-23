/**
 * Shared enums & constants for Trainygo.
 * Kept framework-agnostic so they can be imported on client and server.
 */

export const USER_ROLES = ["super_admin", "coach", "client", "team_member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Preset specializations a coach can assign to a team member. Each preset seeds a default permission bag (see src/lib/permissions/team.ts), but the coach can customize permissions per member afterward — the specialization is a label, not the source of authority. */
export const TEAM_SPECIALIZATIONS = [
  "nutrition_specialist",
  "assistant_coach",
  "fitness_coach",
  "academy_manager",
  "physiotherapist",
] as const;
export type TeamSpecialization = (typeof TEAM_SPECIALIZATIONS)[number];

/** Every permission a team member can be granted. New roles/specializations should only ever combine these — never require new architecture. */
export const TEAM_PERMISSION_KEYS = [
  "canAccessNutrition",
  "canAccessWorkout",
  "canAccessReports",
  "canManageClients",
  "canManageTeam",
  "canManageSubscriptions",
  "canAccessBranding",
  "canAccessBilling",
  "canAccessAnalytics",
  "canAccessRecovery",
  "canAccessTemplates",
  "canAccessFoods",
  "canAccessExercises",
  "canAccessMeasurements",
  "canAccessSystem",
  "canAccessSuperAdmin",
] as const;
export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

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

/**
 * Coach-assigned preference weight for a food, used by the nutrition
 * generator's rule engine to rank candidates. 5 = ★★★★★ (highest / most
 * preferred), 1 = ★☆☆☆☆ (rarely). Stored as a number so it sorts cheaply;
 * the star glyphs and Arabic labels are presentation-only (see labels.ts).
 */
export const FOOD_PRIORITIES = [5, 4, 3, 2, 1] as const;
export type FoodPriority = (typeof FOOD_PRIORITIES)[number];
// Baseline is the lowest star: every food starts at ★ and coaches raise the
// stars for the foods they actually want the generator to prefer.
export const DEFAULT_FOOD_PRIORITY: FoodPriority = 1;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];


/**
 * Which meals a food belongs in — a second, independent axis from the star
 * priority: stars say how much a coach likes a food, this says *when* it fits
 * (oats at breakfast, not dinner). The generator prefers foods tagged for the
 * meal it is filling and only falls back to the rest when nothing fits, so the
 * two rank together rather than one overriding the other.
 *
 * An empty or missing list means "no preference — fits every meal", which is
 * also the default. That keeps every existing food working untouched.
 */
export const DEFAULT_FOOD_MEALS: MealType[] = [...MEAL_TYPES];

/** True when `meals` places a food in `meal` (an empty list fits everything). */
export function foodFitsMeal(meals: MealType[] | undefined, meal: MealType): boolean {
  return !meals?.length || meals.includes(meal);
}

/**
 * Goals offered by the nutrition template generator. Each maps to a default
 * macro ratio (see src/lib/generator/config.ts). `vegetarian`/`vegan` also
 * apply a diet filter over the food pool. Kept here (not just in the generator)
 * so future generators can share the same goal vocabulary.
 */
export const GENERATOR_GOALS = [
  "weight_loss",
  "maintain",
  "muscle_gain",
  "high_protein",
  "low_carb",
  "balanced",
  "vegetarian",
  "vegan",
] as const;
export type GeneratorGoal = (typeof GENERATOR_GOALS)[number];

/** Calorie presets the coach can pick as a daily target. */
export const GENERATOR_CALORIE_OPTIONS = [
  1200, 1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500, 4000,
] as const;

/** Meals-per-day presets. */
export const GENERATOR_MEALS_OPTIONS = [3, 4, 5, 6] as const;

/** A client subscription is either running normally or temporarily frozen by the coach. */
export const CLIENT_FREEZE_STATUSES = ["active", "frozen"] as const;
export type ClientFreezeStatus = (typeof CLIENT_FREEZE_STATUSES)[number];

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
  "exercise_change_request",
  "exercise_change_resolved",
  "subscription_frozen",
  "subscription_resumed",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * ─── Unified Notification Delivery layer (channel-agnostic) ─────────────────
 *
 * A notification (the record) is decoupled from how it is delivered (channels).
 * Business code emits an event → the dispatcher persists ONE Notification
 * (source of truth) → the channel resolver fans it out to zero or more
 * channels. Adding a channel later = one entry here + one adapter, with no
 * change to business logic, models, or existing channels.
 */
export const NOTIFICATION_CHANNELS = [
  "in_app", // always on — the saved Notification itself (source of truth)
  "web_push", // VAPID browser push (P2)
  // future: "fcm", "apns", "email", "sms", "whatsapp"
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Physical platform a registered Device lives on. */
export const DEVICE_PLATFORMS = ["web", "android", "ios"] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/** Push transport a Device speaks — selects the adapter used to reach it. */
export const DEVICE_TRANSPORTS = ["webpush", "fcm", "apns"] as const;
export type DeviceTransport = (typeof DEVICE_TRANSPORTS)[number];

/**
 * Per-channel delivery lifecycle. The Notification record carries user-facing
 * state (read / clickedAt); a NotificationDelivery (P2) carries transport state
 * per channel/device. Not all states are written yet, but the enum is complete
 * so the schema never needs a migration to support them.
 */
export const DELIVERY_STATUSES = [
  "pending",
  "queued",
  "sent",
  "delivered",
  "clicked",
  "failed",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * Client→coach request/workflow types. This is a GENERIC request system:
 * "exercise_change" is the only type exposed in the UI today, but the model,
 * services and coach dashboard are all keyed on `type` so future request
 * kinds (nutrition change, meal replacement, workout difficulty, equipment
 * issue, pain report, schedule change...) plug in without new architecture —
 * just a new entry here plus a type-specific payload shape.
 */
export const REQUEST_TYPES = [
  "exercise_change",
  // Future-ready (not yet exposed in the UI):
  "nutrition_change",
  "meal_replacement",
  "workout_difficulty",
  "equipment_issue",
  "pain_report",
  "schedule_change",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

/** Lifecycle status shared by every request type. */
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * Preset quick-reason keys a client can pick when requesting an exercise
 * change. Stored as a stable key; the localized label lives in
 * src/lib/i18n/labels.ts so it renders in the client's and coach's locale.
 */
export const EXERCISE_CHANGE_QUICK_REASONS = [
  "pain",
  "equipment_unavailable",
  "too_hard",
  "prefer_other",
  "injury",
  "other",
] as const;
export type ExerciseChangeQuickReason =
  (typeof EXERCISE_CHANGE_QUICK_REASONS)[number];

export const TRIAL_DURATION_DAYS = 7;

/** Trial coaches may onboard at most this many clients (the free trial is not unlimited capacity). */
export const TRIAL_MAX_CLIENTS = 1;

/** Trial coaches may not create team members. */
export const TRIAL_MAX_TEAM_MEMBERS = 0;

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
