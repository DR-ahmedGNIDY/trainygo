import type { FoodCategory, FoodUnit } from "@/lib/constants";

export interface SeedFood {
  nameAr: string;
  nameEn: string;
  category: FoodCategory;
  unit: FoodUnit;
  unitGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Small starter food library (system). Phase 6 imports the full 3000+ set. */
export const STARTER_FOODS: SeedFood[] = [
  { nameAr: "صدر دجاج مشوي", nameEn: "Grilled Chicken Breast", category: "protein", unit: "100g", unitGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { nameAr: "لحم بقري مفروم", nameEn: "Lean Ground Beef", category: "protein", unit: "100g", unitGrams: 100, calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  { nameAr: "بيض مسلوق", nameEn: "Boiled Egg", category: "protein", unit: "piece", unitGrams: 50, calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 },
  { nameAr: "سمك سلمون", nameEn: "Salmon", category: "protein", unit: "100g", unitGrams: 100, calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { nameAr: "تونة في الماء", nameEn: "Tuna (in water)", category: "protein", unit: "100g", unitGrams: 100, calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 },
  { nameAr: "أرز أبيض مطبوخ", nameEn: "Cooked White Rice", category: "carbs", unit: "100g", unitGrams: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { nameAr: "شوفان", nameEn: "Oats", category: "carbs", unit: "100g", unitGrams: 100, calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 },
  { nameAr: "بطاطس مسلوقة", nameEn: "Boiled Potato", category: "carbs", unit: "100g", unitGrams: 100, calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
  { nameAr: "خبز أسمر", nameEn: "Whole Wheat Bread", category: "carbs", unit: "piece", unitGrams: 40, calories: 100, protein: 4, carbs: 18, fat: 1.5, fiber: 3 },
  { nameAr: "مكرونة مطبوخة", nameEn: "Cooked Pasta", category: "carbs", unit: "100g", unitGrams: 100, calories: 158, protein: 6, carbs: 31, fat: 0.9, fiber: 1.8 },
  { nameAr: "بروكلي", nameEn: "Broccoli", category: "vegetables", unit: "100g", unitGrams: 100, calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { nameAr: "خيار", nameEn: "Cucumber", category: "vegetables", unit: "100g", unitGrams: 100, calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  { nameAr: "سبانخ", nameEn: "Spinach", category: "vegetables", unit: "100g", unitGrams: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { nameAr: "موز", nameEn: "Banana", category: "fruits", unit: "piece", unitGrams: 120, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
  { nameAr: "تفاح", nameEn: "Apple", category: "fruits", unit: "piece", unitGrams: 180, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { nameAr: "زبدة فول سوداني", nameEn: "Peanut Butter", category: "healthy_fats", unit: "spoon", unitGrams: 16, calories: 94, protein: 4, carbs: 3.2, fat: 8, fiber: 0.9 },
  { nameAr: "زيت زيتون", nameEn: "Olive Oil", category: "healthy_fats", unit: "spoon", unitGrams: 14, calories: 119, protein: 0, carbs: 0, fat: 14, fiber: 0 },
  { nameAr: "لوز", nameEn: "Almonds", category: "healthy_fats", unit: "100g", unitGrams: 100, calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  { nameAr: "أفوكادو", nameEn: "Avocado", category: "healthy_fats", unit: "100g", unitGrams: 100, calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
  { nameAr: "حليب خالي الدسم", nameEn: "Skim Milk", category: "drinks", unit: "cup", unitGrams: 240, calories: 83, protein: 8, carbs: 12, fat: 0.2, fiber: 0 },
  { nameAr: "زبادي يوناني", nameEn: "Greek Yogurt", category: "protein", unit: "100g", unitGrams: 100, calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
  { nameAr: "واي بروتين", nameEn: "Whey Protein", category: "supplements", unit: "spoon", unitGrams: 30, calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },
];
