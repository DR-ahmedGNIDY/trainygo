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

/** Coach-wide adherence report: one row per active client with a nutrition plan. */
export async function getCoachNutritionReport(coachId: string, windowDays = 7): Promise<ClientAdherence[]> {
  await connectToDatabase();
  const plans = await NutritionPlan.find({ coach: new Types.ObjectId(coachId), status: "active" })
    .populate("client", "name")
    .lean();

  const since = new Date(startOfDay().getTime() - (windowDays - 1) * 86_400_000);

  const rows = await Promise.all(
    plans.map(async (plan) => {
      const totalMealsPerDay = (plan.meals as IMeal[]).filter((m) => m.items.length > 0).length;
      const day = startOfDay();
      const [todayLogs, windowCount] = await Promise.all([
        MealLog.find({ plan: plan._id, day }).lean(),
        MealLog.countDocuments({ plan: plan._id, day: { $gte: since } }),
      ]);
      const expectedInWindow = totalMealsPerDay * windowDays;
      const adherencePct = expectedInWindow > 0 ? Math.min(100, Math.round((windowCount / expectedInWindow) * 100)) : 0;
      const actualCaloriesToday = todayLogs.reduce((s, l) => s + (l.calories || 0), 0);

      return {
        clientId: String(plan.client._id ?? plan.client),
        clientName: (plan.client as unknown as { name?: string })?.name ?? "—",
        targetCalories: plan.totals?.calories ?? 0,
        actualCaloriesToday: Math.round(actualCaloriesToday),
        completedMealsToday: todayLogs.length,
        incompleteMealsToday: Math.max(0, totalMealsPerDay - todayLogs.length),
        totalMealsPerDay,
        adherencePct,
      };
    }),
  );

  return rows;
}

/** Single client's adherence (used on the client-profile overview, optional reuse). */
export async function getClientAdherence(coachId: string, clientId: string, windowDays = 7) {
  const all = await getCoachNutritionReport(coachId, windowDays);
  return all.find((r) => r.clientId === clientId) ?? null;
}
