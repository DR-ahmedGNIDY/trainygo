import type { IMeal } from "@/models/NutritionTemplate";

interface SeedNutritionTemplate {
  nameAr: string;
  nameEn: string;
  targetCalories: number;
  meals: IMeal[];
}

const item = (
  nameAr: string,
  nameEn: string,
  quantity: number,
  unit: "100g" | "piece" | "cup" | "spoon",
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
) => ({ food: null, nameAr, nameEn, quantity, unit, calories, protein, carbs, fat, fiber: 0, substitutes: [] });

export const SYSTEM_NUTRITION_TEMPLATES: SeedNutritionTemplate[] = [
  {
    nameAr: "خسارة دهون 1800 سعرة",
    nameEn: "1800 kcal Fat Loss",
    targetCalories: 1800,
    meals: [
      { type: "breakfast", items: [item("شوفان", "Oats", 60, "100g", 233, 10, 40, 4), item("بيض مسلوق", "Boiled Egg", 2, "piece", 156, 12, 1, 11)] },
      { type: "lunch", items: [item("صدر دجاج مشوي", "Grilled Chicken Breast", 200, "100g", 330, 62, 0, 7), item("أرز أبيض مطبوخ", "White Rice", 150, "100g", 195, 4, 42, 0.5)] },
      { type: "dinner", items: [item("تونة في الماء", "Tuna", 100, "100g", 116, 26, 0, 1), item("سلطة خضراء", "Green Salad", 1, "cup", 40, 2, 6, 1)] },
      { type: "snack", items: [item("زبادي يوناني", "Greek Yogurt", 150, "100g", 89, 15, 5, 0.6)] },
    ],
  },
  {
    nameAr: "صيانة 2200 سعرة",
    nameEn: "2200 kcal Maintenance",
    targetCalories: 2200,
    meals: [
      { type: "breakfast", items: [item("شوفان", "Oats", 80, "100g", 311, 14, 53, 6), item("موز", "Banana", 1, "piece", 105, 1, 27, 0.4)] },
      { type: "lunch", items: [item("لحم بقري مفروم", "Lean Ground Beef", 150, "100g", 375, 39, 0, 22), item("مكرونة مطبوخة", "Cooked Pasta", 150, "100g", 237, 9, 47, 1)] },
      { type: "dinner", items: [item("سمك سلمون", "Salmon", 150, "100g", 312, 30, 0, 20), item("بطاطس مسلوقة", "Boiled Potato", 200, "100g", 174, 4, 40, 0.2)] },
      { type: "snack", items: [item("واي بروتين", "Whey Protein", 1, "spoon", 120, 24, 3, 1.5)] },
    ],
  },
  {
    nameAr: "تضخيم 3000 سعرة",
    nameEn: "3000 kcal Bulk",
    targetCalories: 3000,
    meals: [
      { type: "breakfast", items: [item("شوفان", "Oats", 100, "100g", 389, 17, 66, 7), item("زبدة فول سوداني", "Peanut Butter", 2, "spoon", 188, 8, 6, 16)] },
      { type: "lunch", items: [item("صدر دجاج مشوي", "Grilled Chicken Breast", 250, "100g", 412, 77, 0, 9), item("أرز أبيض مطبوخ", "White Rice", 250, "100g", 325, 7, 70, 0.8)] },
      { type: "dinner", items: [item("لحم بقري مفروم", "Lean Ground Beef", 200, "100g", 500, 52, 0, 30), item("خبز أسمر", "Whole Wheat Bread", 2, "piece", 200, 8, 36, 3)] },
      { type: "snack", items: [item("واي بروتين", "Whey Protein", 2, "spoon", 240, 48, 6, 3), item("لوز", "Almonds", 30, "100g", 174, 6, 7, 15)] },
    ],
  },
];
