import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Food } from "@/models/Food";
import { NutritionGeneration } from "@/models/NutritionGeneration";
import { serialize } from "@/lib/serialize";
import { DEFAULT_FOOD_PRIORITY } from "@/lib/constants";
import { getPriorityOverrides } from "@/lib/services/foods";
import { generatePlan } from "@/lib/generator/engine";
import type { EngineFood, GeneratorInput, GeneratedPlan } from "@/lib/generator/types";

export type GenScope =
  | { role: "super_admin" }
  | { role: "coach"; coachId: string };

const HISTORY_LIMIT = 20;

function visibility(scope: GenScope) {
  if (scope.role === "coach") {
    return {
      $or: [
        { isSystemFood: true },
        { createdByCoach: new Types.ObjectId(scope.coachId) },
      ],
    };
  }
  return { isSystemFood: true };
}

/**
 * Load the coach's visible food library as engine foods. One query, projected
 * to just the fields the engine needs — the engine caches nothing, so we hand
 * it a ready-to-use array (category lookups are built once inside the engine).
 */
export async function loadFoodPool(scope: GenScope): Promise<EngineFood[]> {
  await connectToDatabase();
  const docs = await Food.find(visibility(scope))
    .select(
      "nameAr nameEn category priority unit unitGrams calories protein carbs fat fiber",
    )
    .lean();

  // Apply this coach's personal priority overrides on top of the base priority
  // so the generator ranks foods the way the coach set them, per-account only.
  const overrides =
    scope.role === "coach" ? await getPriorityOverrides(scope.coachId) : new Map<string, number>();

  return docs.map((f) => ({
    id: String(f._id),
    nameAr: f.nameAr,
    nameEn: f.nameEn,
    category: f.category,
    priority: overrides.get(String(f._id)) ?? f.priority ?? DEFAULT_FOOD_PRIORITY,
    unit: f.unit ?? "100g",
    unitGrams: f.unitGrams ?? 100,
    calories: f.calories ?? 0,
    protein: f.protein ?? 0,
    carbs: f.carbs ?? 0,
    fat: f.fat ?? 0,
    fiber: f.fiber ?? 0,
  }));
}

/**
 * Generate a plan and persist it to the coach's history (last 20 kept). Throws
 * GeneratorError on empty library / missing categories — the action layer maps
 * those to a friendly message.
 */
export async function generateAndRecord(
  scope: GenScope,
  input: GeneratorInput,
): Promise<{ plan: GeneratedPlan; historyId: string | null }> {
  const pool = await loadFoodPool(scope);
  const plan = generatePlan(pool, input);

  let historyId: string | null = null;
  if (scope.role === "coach") {
    const coach = new Types.ObjectId(scope.coachId);
    const doc = await NutritionGeneration.create({
      coach,
      calories: input.calories,
      goal: input.goal,
      mealsPerDay: input.mealsPerDay,
      ratio: plan.ratio,
      seed: input.seed ?? 0,
      meals: plan.meals,
      summary: {
        calories: plan.totals.calories,
        protein: plan.totals.protein,
        carbs: plan.totals.carbs,
        fat: plan.totals.fat,
      },
      withinTolerance: plan.withinTolerance,
    });
    historyId = doc._id.toString();

    // Prune to the most recent HISTORY_LIMIT for this coach.
    const stale = await NutritionGeneration.find({ coach })
      .sort({ createdAt: -1 })
      .skip(HISTORY_LIMIT)
      .select("_id")
      .lean();
    if (stale.length) {
      await NutritionGeneration.deleteMany({
        _id: { $in: stale.map((d) => d._id) },
      });
    }
  }

  return { plan, historyId };
}

export async function listGenerations(scope: GenScope) {
  if (scope.role !== "coach") return [];
  await connectToDatabase();
  const docs = await NutritionGeneration.find({
    coach: new Types.ObjectId(scope.coachId),
  })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return serialize(docs);
}

export async function getGeneration(id: string, scope: GenScope) {
  if (scope.role !== "coach") return null;
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await NutritionGeneration.findOne({
    _id: id,
    coach: new Types.ObjectId(scope.coachId),
  }).lean();
  return doc ? serialize(doc) : null;
}
