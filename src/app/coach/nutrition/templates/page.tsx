import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { NutritionTemplatesView, type NutritionTplItem } from "./templates-view";

export const dynamic = "force-dynamic";

export default async function NutritionTemplatesPage() {
  const session = await requireRole("coach");
  const raw = await listNutritionTemplates({ role: "coach", coachId: session.user.id });
  const items: NutritionTplItem[] = raw.map((tpl) => ({
    id: String(tpl._id),
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    targetCalories: tpl.targetCalories,
    meals: tpl.meals?.length ?? 0,
    isSystem: tpl.isSystemTemplate,
  }));
  return <NutritionTemplatesView items={items} canWrite={coachCanWrite(session.user.status)} />;
}
