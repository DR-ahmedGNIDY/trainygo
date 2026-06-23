import type {
  ClientGoal,
  ExerciseCategory,
  FoodCategory,
  FoodUnit,
  Gender,
  Locale,
  MealType,
} from "@/lib/constants";

type L = { ar: string; en: string };

export const GOAL_LABELS: Record<ClientGoal, L> = {
  fat_loss: { ar: "خسارة دهون", en: "Fat loss" },
  muscle_gain: { ar: "بناء عضل", en: "Muscle gain" },
  maintenance: { ar: "صيانة", en: "Maintenance" },
  strength: { ar: "قوة", en: "Strength" },
  general_fitness: { ar: "لياقة عامة", en: "General fitness" },
  rehabilitation: { ar: "تأهيل", en: "Rehabilitation" },
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

export function label(map: Record<string, L>, key: string | undefined, locale: Locale): string {
  if (!key || !map[key]) return "";
  return map[key][locale];
}
