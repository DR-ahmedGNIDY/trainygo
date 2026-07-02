import { requireCoachArea } from "@/lib/auth/session";
import { canAccessNutrition } from "@/lib/permissions/team";
import { getCoachNutritionReport } from "@/lib/services/meal-logs";
import { NutritionProgressView } from "./nutrition-progress-view";

export const dynamic = "force-dynamic";

export default async function CoachNutritionProgressPage() {
  const ctx = await requireCoachArea(canAccessNutrition);
  const rows = await getCoachNutritionReport(ctx.coachId);
  return <NutritionProgressView rows={rows} />;
}
