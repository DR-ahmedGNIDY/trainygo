import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { isOfficialTemplate } from "@/lib/templates";
import { NutritionTemplatesView, type NutritionTplItem } from "./templates-view";

export const dynamic = "force-dynamic";

export default async function NutritionTemplatesPage() {
  const ctx = await requireCoachArea(canAccessTemplates);
  const raw = await listNutritionTemplates({ role: "coach", coachId: ctx.coachId });
  const items: NutritionTplItem[] = raw.map((tpl) => ({
    id: String(tpl._id),
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    targetCalories: tpl.targetCalories,
    meals: tpl.meals?.length ?? 0,
    official: isOfficialTemplate(tpl),
    // Both fields postdate the earliest templates, hence the defaults.
    featured: tpl.featured ?? false,
    version: tpl.version ?? 1,
  }));
  return <NutritionTemplatesView items={items} canWrite={coachCanWrite(ctx.status)} />;
}
