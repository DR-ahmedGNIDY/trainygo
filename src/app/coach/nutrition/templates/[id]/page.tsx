import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getNutritionTemplate } from "@/lib/services/nutrition-templates";
import {
  cloneNutritionTemplateAction,
  saveNutritionTemplateBuilderAction,
} from "@/lib/actions/templates";
import { NutritionBuilder } from "@/components/builders/nutrition-builder";
import {
  NutritionTemplatePreview,
  type PreviewMeal,
} from "@/components/templates/template-preview";
import { isOfficialTemplate } from "@/lib/templates";
import { mealsToBuilder } from "@/lib/builder-mappers";
import type { IMeal } from "@/models/NutritionTemplate";

export const dynamic = "force-dynamic";

export default async function NutritionTemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canAccessTemplates);
  if (!coachCanWrite(ctx.status)) redirect("/coach/subscription");

  // The service already scoped this to "own or global", so a hit here is never
  // another coach's template.
  const tpl = await getNutritionTemplate(id, { role: "coach", coachId: ctx.coachId });
  if (!tpl) notFound();

  // Official templates are read-only for a coach — preview + duplicate instead.
  if (isOfficialTemplate(tpl)) {
    async function duplicate() {
      "use server";
      return cloneNutritionTemplateAction(id);
    }
    return (
      <NutritionTemplatePreview
        backHref="/coach/nutrition/templates"
        duplicateHref="/coach/nutrition/templates"
        title="قوالب التغذية"
        nameAr={tpl.nameAr}
        nameEn={tpl.nameEn}
        meals={tpl.meals as unknown as PreviewMeal[]}
        onDuplicate={duplicate}
      />
    );
  }

  async function save(data: { nameAr: string; nameEn: string; meals: unknown[] }) {
    "use server";
    return saveNutritionTemplateBuilderAction(id, {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      meals: data.meals as IMeal[],
    });
  }

  return (
    <NutritionBuilder
      backHref="/coach/nutrition/templates"
      title="قوالب التغذية"
      initialNameAr={tpl.nameAr}
      initialNameEn={tpl.nameEn}
      initialMeals={mealsToBuilder(tpl.meals as unknown as IMeal[])}
      onSave={save}
    />
  );
}
