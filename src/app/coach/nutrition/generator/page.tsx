import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listGenerations } from "@/lib/services/nutrition-generator";
import { NutritionGeneratorView, type HistoryEntry } from "./generator-view";

export const dynamic = "force-dynamic";

export default async function NutritionGeneratorPage() {
  const ctx = await requireCoachArea(canAccessTemplates);
  const scope = { role: "coach" as const, coachId: ctx.coachId };
  const raw = await listGenerations(scope);
  const history: HistoryEntry[] = raw.map((h) => ({
    id: String(h._id),
    calories: h.calories,
    goal: h.goal,
    mealsPerDay: h.mealsPerDay,
    ratio: h.ratio,
    seed: h.seed,
    meals: h.meals as unknown as HistoryEntry["meals"],
    summary: h.summary,
    withinTolerance: h.withinTolerance,
    createdAt: typeof h.createdAt === "string" ? h.createdAt : new Date(h.createdAt).toISOString(),
  }));

  return (
    <NutritionGeneratorView history={history} canWrite={coachCanWrite(ctx.status)} />
  );
}
