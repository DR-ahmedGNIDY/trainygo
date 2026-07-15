import type { FoodCategory, GeneratorGoal, MealType } from "@/lib/constants";
import type { MacroRatio } from "./types";

/**
 * Default macro ratios per goal (percent of calories). These come straight from
 * the product spec. A coach can override them with a custom ratio at generate
 * time; when they don't, the goal's default here is used.
 */
export const DEFAULT_RATIOS: Record<GeneratorGoal, MacroRatio> = {
  weight_loss: { protein: 40, carbs: 30, fat: 30 },
  muscle_gain: { protein: 30, carbs: 50, fat: 20 },
  balanced: { protein: 30, carbs: 40, fat: 30 },
  high_protein: { protein: 45, carbs: 30, fat: 25 },
  low_carb: { protein: 40, carbs: 20, fat: 40 },
  // Maintain / vegetarian / vegan default to a balanced split; diet goals also
  // apply a food filter (see DIET_EXCLUDE_KEYWORDS).
  maintain: { protein: 30, carbs: 40, fat: 30 },
  vegetarian: { protein: 30, carbs: 40, fat: 30 },
  vegan: { protein: 30, carbs: 40, fat: 30 },
};

/**
 * Which meal slots make up a day for each meals-per-day option. Snacks fill the
 * gaps between the three main meals so the day reads naturally.
 */
export const MEALS_PER_DAY_SEQUENCE: Record<number, MealType[]> = {
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "snack", "lunch", "dinner"],
  5: ["breakfast", "snack", "lunch", "snack", "dinner"],
  6: ["breakfast", "snack", "lunch", "snack", "dinner", "snack"],
};

/**
 * Required food categories per meal type (from the spec's Meal Rules). Snacks
 * are handled separately via SNACK_ROTATION so repeated snacks vary.
 */
export const MEAL_COMPOSITION: Record<MealType, FoodCategory[]> = {
  breakfast: ["protein", "carbs", "fruits"],
  lunch: ["protein", "carbs", "vegetables"],
  dinner: ["protein", "healthy_fats", "vegetables"],
  snack: ["fruits", "dairy"], // overridden per-snack by SNACK_ROTATION
};

/** Snacks rotate through these categories (spec: Fruit, Dairy, Healthy Fat). */
export const SNACK_ROTATION: FoodCategory[] = ["fruits", "dairy", "healthy_fats"];

/** Relative calorie weight of each meal type; snacks are lighter than mains. */
export const MEAL_WEIGHT: Record<MealType, number> = {
  breakfast: 1,
  lunch: 1.2,
  dinner: 1.1,
  snack: 0.5,
};

/** Categories the plan cannot be built without — used for up-front validation. */
export const REQUIRED_CATEGORIES: FoodCategory[] = ["protein", "carbs"];

/**
 * Keyword blocklists for the vegetarian/vegan diet filter. The food library has
 * no explicit diet flag, so we exclude by name (Arabic + English) — a pragmatic,
 * fully deterministic heuristic. Vegan additionally drops the whole dairy
 * category and egg/honey items.
 */
export const DIET_EXCLUDE_KEYWORDS: Record<"vegetarian" | "vegan", string[]> = {
  vegetarian: [
    "chicken", "beef", "meat", "steak", "lamb", "veal", "mutton", "liver",
    "fish", "tuna", "salmon", "shrimp", "prawn", "turkey", "duck", "rabbit",
    "sausage", "bacon", "ham", "seafood", "cod", "sardine", "mackerel", "crab",
    "calamari", "squid", "octopus", "clam", "oyster", "mussel", "lobster",
    "anchovy", "herring", "tilapia", "kebab", "pastrami", "hot dog", "pepperoni",
    "دجاج", "لحم", "بقري", "ستيك", "ضاني", "كبدة", "سمك", "تونة", "سلمون",
    "جمبري", "ديك رومي", "بط", "أرنب", "سجق", "لانشون", "بسطرمة", "كابوريا",
    "حبار", "كاليماري", "أخطبوط", "محار", "بلح البحر", "جراد البحر", "كباب",
    "همبرجر", "هوت دوج", "بيبروني", "مورتاديلا", "بلطي",
  ],
  vegan: [
    // everything vegetarian excludes, plus animal by-products
    "chicken", "beef", "meat", "steak", "lamb", "veal", "mutton", "liver",
    "fish", "tuna", "salmon", "shrimp", "prawn", "turkey", "duck", "rabbit",
    "sausage", "bacon", "ham", "seafood", "cod", "sardine", "mackerel", "crab",
    "calamari", "squid", "octopus", "clam", "oyster", "mussel", "lobster",
    "anchovy", "herring", "tilapia", "kebab", "pastrami", "hot dog", "pepperoni",
    "egg", "milk", "cheese", "yogurt", "yoghurt", "butter", "honey", "whey",
    "دجاج", "لحم", "بقري", "ستيك", "ضاني", "كبدة", "سمك", "تونة", "سلمون",
    "جمبري", "ديك رومي", "بط", "أرنب", "سجق", "لانشون", "بسطرمة", "كابوريا",
    "حبار", "كاليماري", "أخطبوط", "محار", "بلح البحر", "جراد البحر", "كباب",
    "همبرجر", "هوت دوج", "بيبروني", "مورتاديلا", "بلطي",
    "بيض", "حليب", "لبن", "جبن", "زبادي", "زبدة", "عسل", "واي",
  ],
};

/** ±3% acceptance tolerance for calories and each macro. */
export const TOLERANCE = 0.03;
