import { requireRole } from "@/lib/auth/session";
import { getCoachNutritionReport } from "@/lib/services/meal-logs";
import { NutritionProgressView } from "./nutrition-progress-view";

export const dynamic = "force-dynamic";

export default async function CoachNutritionProgressPage() {
  const session = await requireRole("coach");
  const rows = await getCoachNutritionReport(session.user.id);
  return <NutritionProgressView rows={rows} />;
}
