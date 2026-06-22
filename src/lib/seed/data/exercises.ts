import type { NormalizedExercise } from "@/lib/import/types";

/**
 * Small starter exercise library (system). Phase 6 imports the full 1000+
 * dataset via the import adapters; this seeds enough to use the app.
 */
export const STARTER_EXERCISES: NormalizedExercise[] = [
  { source: "manual", externalId: "seed-chest-1", nameAr: "ضغط بنش بالبار", nameEn: "Barbell Bench Press", category: "chest", targetMuscles: ["chest", "triceps", "shoulders"] },
  { source: "manual", externalId: "seed-chest-2", nameAr: "ضغط مائل بالدمبل", nameEn: "Incline Dumbbell Press", category: "chest", targetMuscles: ["upper chest", "shoulders"] },
  { source: "manual", externalId: "seed-chest-3", nameAr: "تفتيح كابل", nameEn: "Cable Fly", category: "chest", targetMuscles: ["chest"] },
  { source: "manual", externalId: "seed-back-1", nameAr: "سحب أرضي", nameEn: "Deadlift", category: "back", targetMuscles: ["back", "hamstrings", "glutes"] },
  { source: "manual", externalId: "seed-back-2", nameAr: "تمرين العقلة", nameEn: "Pull-up", category: "back", targetMuscles: ["lats", "biceps"] },
  { source: "manual", externalId: "seed-back-3", nameAr: "تجديف بالبار", nameEn: "Barbell Row", category: "back", targetMuscles: ["back", "biceps"] },
  { source: "manual", externalId: "seed-sh-1", nameAr: "ضغط كتف بالدمبل", nameEn: "Dumbbell Shoulder Press", category: "shoulders", targetMuscles: ["shoulders", "triceps"] },
  { source: "manual", externalId: "seed-sh-2", nameAr: "رفرفة جانبية", nameEn: "Lateral Raise", category: "shoulders", targetMuscles: ["side delts"] },
  { source: "manual", externalId: "seed-bi-1", nameAr: "مرجحة بايسبس بالبار", nameEn: "Barbell Curl", category: "biceps", targetMuscles: ["biceps"] },
  { source: "manual", externalId: "seed-bi-2", nameAr: "مرجحة مطرقة", nameEn: "Hammer Curl", category: "biceps", targetMuscles: ["biceps", "forearms"] },
  { source: "manual", externalId: "seed-tri-1", nameAr: "ترايسبس بالحبل", nameEn: "Triceps Rope Pushdown", category: "triceps", targetMuscles: ["triceps"] },
  { source: "manual", externalId: "seed-tri-2", nameAr: "تمديد علوي بالدمبل", nameEn: "Overhead Dumbbell Extension", category: "triceps", targetMuscles: ["triceps"] },
  { source: "manual", externalId: "seed-leg-1", nameAr: "سكوات خلفي", nameEn: "Back Squat", category: "legs", targetMuscles: ["quads", "glutes"] },
  { source: "manual", externalId: "seed-leg-2", nameAr: "دفع الأرجل", nameEn: "Leg Press", category: "legs", targetMuscles: ["quads", "glutes"] },
  { source: "manual", externalId: "seed-leg-3", nameAr: "رفعة رومانية", nameEn: "Romanian Deadlift", category: "legs", targetMuscles: ["hamstrings", "glutes"] },
  { source: "manual", externalId: "seed-glu-1", nameAr: "دفع الورك", nameEn: "Hip Thrust", category: "glutes", targetMuscles: ["glutes"] },
  { source: "manual", externalId: "seed-abs-1", nameAr: "بلانك", nameEn: "Plank", category: "abs", targetMuscles: ["core"] },
  { source: "manual", externalId: "seed-abs-2", nameAr: "رفع الأرجل معلقاً", nameEn: "Hanging Leg Raise", category: "abs", targetMuscles: ["lower abs"] },
  { source: "manual", externalId: "seed-cardio-1", nameAr: "جري على المشاية", nameEn: "Treadmill Run", category: "cardio", targetMuscles: ["cardiovascular"] },
  { source: "manual", externalId: "seed-cardio-2", nameAr: "دراجة ثابتة", nameEn: "Stationary Bike", category: "cardio", targetMuscles: ["cardiovascular", "legs"] },
  { source: "manual", externalId: "seed-stretch-1", nameAr: "إطالة أوتار الركبة", nameEn: "Hamstring Stretch", category: "stretching", targetMuscles: ["hamstrings"] },
  { source: "manual", externalId: "seed-full-1", nameAr: "بربي", nameEn: "Burpee", category: "full_body", targetMuscles: ["full body"] },
];
