import type {
  ClientGoal,
  ExerciseCategory,
  ExerciseChangeQuickReason,
  FoodCategory,
  FoodPriority,
  FoodUnit,
  Gender,
  GeneratorGoal,
  Locale,
  MealType,
  RequestStatus,
  TemplateCreatorType,
} from "@/lib/constants";

type L = { ar: string; en: string };

export const GOAL_LABELS: Record<ClientGoal, L> = {
  muscle_building: { ar: "زيادة كتلة عضلية", en: "Muscle Building" },
  fat_loss: { ar: "نزول في الوزن", en: "Fat Loss" },
  athletic_conditioning: { ar: "إعداد بدني", en: "Athletic Conditioning" },
};

export const GENDER_LABELS: Record<Gender, L> = {
  male: { ar: "ذكر", en: "Male" },
  female: { ar: "أنثى", en: "Female" },
};

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, L> = {
  chest: { ar: "صدر", en: "Chest" },
  back: { ar: "ظهر", en: "Back" },
  shoulders: { ar: "أكتاف", en: "Shoulders" },
  biceps: { ar: "بايسبس", en: "Biceps" },
  triceps: { ar: "ترايسبس", en: "Triceps" },
  legs: { ar: "أرجل", en: "Legs" },
  glutes: { ar: "جلوتس", en: "Glutes" },
  abs: { ar: "بطن", en: "Abs" },
  cardio: { ar: "كارديو", en: "Cardio" },
  swimming: { ar: "سباحة", en: "Swimming" },
  stretching: { ar: "إطالة", en: "Stretching" },
  rehabilitation: { ar: "تأهيل", en: "Rehabilitation" },
  full_body: { ar: "كامل الجسم", en: "Full Body" },
};

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, L> = {
  protein: { ar: "بروتين", en: "Protein" },
  carbs: { ar: "كارب", en: "Carbs" },
  vegetables: { ar: "خضروات", en: "Vegetables" },
  fruits: { ar: "فواكه", en: "Fruits" },
  healthy_fats: { ar: "دهون صحية", en: "Healthy Fats" },
  drinks: { ar: "مشروبات", en: "Drinks" },
  dairy: { ar: "منتجات ألبان", en: "Dairy" },
  snacks: { ar: "وجبات خفيفة", en: "Snacks" },
  fast_food: { ar: "وجبات سريعة", en: "Fast Food" },
  supplements: { ar: "مكملات", en: "Supplements" },
};

export const FOOD_PRIORITY_LABELS: Record<FoodPriority, L> = {
  5: { ar: "مفضل جداً", en: "Highest" },
  4: { ar: "مفضل", en: "Preferred" },
  3: { ar: "متوسط", en: "Medium" },
  2: { ar: "استخدام قليل", en: "Low use" },
  1: { ar: "نادراً", en: "Rarely" },
};

/** Star glyphs for each priority level (presentation-only). */
export const FOOD_PRIORITY_STARS: Record<FoodPriority, string> = {
  5: "★★★★★",
  4: "★★★★☆",
  3: "★★★☆☆",
  2: "★★☆☆☆",
  1: "★☆☆☆☆",
};

export const GENERATOR_GOAL_LABELS: Record<GeneratorGoal, L> = {
  weight_loss: { ar: "خسارة الوزن", en: "Weight Loss" },
  maintain: { ar: "الحفاظ على الوزن", en: "Maintain Weight" },
  muscle_gain: { ar: "بناء العضلات", en: "Muscle Gain" },
  high_protein: { ar: "بروتين عالٍ", en: "High Protein" },
  low_carb: { ar: "كربوهيدرات منخفضة", en: "Low Carb" },
  balanced: { ar: "متوازن", en: "Balanced" },
  vegetarian: { ar: "نباتي", en: "Vegetarian" },
  vegan: { ar: "نباتي صرف", en: "Vegan" },
};

export const FOOD_UNIT_LABELS: Record<FoodUnit, L> = {
  "100g": { ar: "١٠٠ جم", en: "100g" },
  piece: { ar: "قطعة", en: "Piece" },
  cup: { ar: "كوب", en: "Cup" },
  spoon: { ar: "ملعقة", en: "Spoon" },
};

export const MEAL_LABELS: Record<MealType, L> = {
  breakfast: { ar: "الفطار", en: "Breakfast" },
  lunch: { ar: "الغداء", en: "Lunch" },
  dinner: { ar: "العشاء", en: "Dinner" },
  snack: { ar: "وجبة خفيفة", en: "Snack" },
};

/**
 * The name to show for a meal: the coach's custom name when they set one,
 * otherwise the default label for its type. Every surface that renders a meal
 * name (builder, client app, reports, previews, history) must go through this
 * so templates saved without a custom name keep working.
 */
export function mealDisplayName(
  // `type` is widened to string because several call sites carry it as a plain
  // string; an unrecognized value falls through to the raw type rather than "".
  meal: { type: MealType | string; name?: { ar?: string; en?: string } | null },
  locale: Locale,
): string {
  return (
    meal.name?.[locale]?.trim() || label(MEAL_LABELS, meal.type, locale) || meal.type
  );
}

export const TEMPLATE_CREATOR_LABELS: Record<TemplateCreatorType, L> = {
  coach: { ar: "خاص", en: "Private" },
  super_admin: { ar: "قالب عام", en: "Global" },
};

export const EXERCISE_CHANGE_QUICK_REASON_LABELS: Record<ExerciseChangeQuickReason, L> = {
  pain: { ar: "يوجد ألم أثناء أداء التمرين", en: "There's pain while doing the exercise" },
  equipment_unavailable: { ar: "لا يوجد الجهاز في الجيم", en: "The machine isn't available at the gym" },
  too_hard: { ar: "التمرين صعب جداً", en: "The exercise is too hard" },
  prefer_other: { ar: "أفضل تمرين آخر", en: "I prefer another exercise" },
  injury: { ar: "لدي إصابة", en: "I have an injury" },
  other: { ar: "سبب آخر", en: "Other reason" },
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, L> = {
  pending: { ar: "قيد المراجعة", en: "Pending" },
  approved: { ar: "تمت الموافقة", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

export function label(map: Record<string, L>, key: string | undefined, locale: Locale): string {
  if (!key || !map[key]) return "";
  return map[key][locale];
}
