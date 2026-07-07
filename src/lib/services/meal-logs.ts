import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { MealLog } from "@/models/MealLog";
import { NutritionPlan } from "@/models/NutritionPlan";
import { PermissionError } from "@/lib/permissions";
import { computeMealTotals } from "./nutrition-calc";
import type { IMeal } from "@/models/NutritionTemplate";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Toggle a meal's "eaten" state for today. Idempotent either way. */
export async function setMealDone(
  clientId: string,
  planId: string,
  mealIndex: number,
  done: boolean,
) {
  await connectToDatabase();
  const plan = await NutritionPlan.findOne({ _id: planId, client: new Types.ObjectId(clientId) }).lean();
  if (!plan) throw new PermissionError("Plan not found", "NOT_FOUND");
  const meal = (plan.meals as IMeal[])[mealIndex];
  if (!meal) throw new PermissionError("Meal not found", "NOT_FOUND");

  const day = startOfDay();

  if (!done) {
    await MealLog.deleteOne({ plan: planId, mealIndex, day });
    return true;
  }

  const totals = computeMealTotals(meal);
  await MealLog.findOneAndUpdate(
    { plan: planId, mealIndex, day },
    {
      client: new Types.ObjectId(clientId),
      coach: plan.coach,
      plan: plan._id,
      mealIndex,
      mealType: meal.type,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      day,
      loggedAt: new Date(),
    },
    { upsert: true },
  );
  return true;
}

/** Which meal indices are marked done today for this plan. */
export async function getTodayDoneIndices(planId: string): Promise<number[]> {
  await connectToDatabase();
  const day = startOfDay();
  const logs = await MealLog.find({ plan: planId, day }).select("mealIndex").lean();
  return logs.map((l) => l.mealIndex);
}

export interface ClientAdherence {
  clientId: string;
  clientName: string;
  targetCalories: number;
  actualCaloriesToday: number;
  completedMealsToday: number;
  incompleteMealsToday: number;
  totalMealsPerDay: number;
  adherencePct: number;
}

/**
 * Coach-wide adherence report: one row per active client with a nutrition plan.
 *
 * Runs in a fixed THREE queries regardless of client count (no N+1):
 *   1. the coach's active plans (with client name),
 *   2. one aggregation for today's per-plan log count + calories,
 *   3. one aggregation for the window's per-plan log count.
 */
export async function getCoachNutritionReport(coachId: string, windowDays = 7): Promise<ClientAdherence[]> {
  await connectToDatabase();
  const plans = await NutritionPlan.find({ coach: new Types.ObjectId(coachId), status: "active" })
    .select("client meals totals")
    .populate("client", "name")
    .lean();
  if (plans.length === 0) return [];

  const day = startOfDay();
  const since = new Date(day.getTime() - (windowDays - 1) * 86_400_000);
  const planIds = plans.map((p) => p._id);

  const [todayAgg, windowAgg] = await Promise.all([
    MealLog.aggregate<{ _id: Types.ObjectId; count: number; calories: number }>([
      { $match: { plan: { $in: planIds }, day } },
      { $group: { _id: "$plan", count: { $sum: 1 }, calories: { $sum: "$calories" } } },
    ]),
    MealLog.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { plan: { $in: planIds }, day: { $gte: since } } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
  ]);

  const todayByPlan = new Map(todayAgg.map((r) => [String(r._id), r]));
  const windowByPlan = new Map(windowAgg.map((r) => [String(r._id), r.count]));

  return plans.map((plan) => {
    const key = String(plan._id);
    const totalMealsPerDay = (plan.meals as IMeal[]).filter((m) => m.items.length > 0).length;
    const today = todayByPlan.get(key);
    const completedMealsToday = today?.count ?? 0;
    const actualCaloriesToday = today?.calories ?? 0;
    const windowCount = windowByPlan.get(key) ?? 0;
    const expectedInWindow = totalMealsPerDay * windowDays;
    const adherencePct = expectedInWindow > 0 ? Math.min(100, Math.round((windowCount / expectedInWindow) * 100)) : 0;

    return {
      clientId: String((plan.client as { _id?: Types.ObjectId })?._id ?? plan.client),
      clientName: (plan.client as unknown as { name?: string })?.name ?? "—",
      targetCalories: plan.totals?.calories ?? 0,
      actualCaloriesToday: Math.round(actualCaloriesToday),
      completedMealsToday,
      incompleteMealsToday: Math.max(0, totalMealsPerDay - completedMealsToday),
      totalMealsPerDay,
      adherencePct,
    };
  });
}

/** Single client's adherence (used on the client-profile overview, optional reuse). */
export async function getClientAdherence(coachId: string, clientId: string, windowDays = 7) {
  const all = await getCoachNutritionReport(coachId, windowDays);
  return all.find((r) => r.clientId === clientId) ?? null;
}
