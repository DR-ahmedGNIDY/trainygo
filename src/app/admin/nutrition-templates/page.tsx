import { requireRole } from "@/lib/auth/session";
import { listNutritionTemplates } from "@/lib/services/nutrition-templates";
import { isOfficialTemplate } from "@/lib/templates";
import {
  NutritionTemplatesView,
  type NutritionTplItem,
} from "@/app/coach/nutrition/templates/templates-view";

export const dynamic = "force-dynamic";

/**
 * Global Nutrition Templates — the super admin's authoring surface.
 *
 * Same view and builder the coach uses; the only difference is the scope, which
 * marks everything created here as isSystemTemplate (official) and therefore
 * visible to every coach.
 */
export default async function AdminNutritionTemplatesPage() {
  await requireRole("super_admin");
  const raw = await listNutritionTemplates({ role: "super_admin" });
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
  return (
    <NutritionTemplatesView
      items={items}
      canWrite
      basePath="/admin/nutrition-templates"
      isAdmin
    />
  );
}
