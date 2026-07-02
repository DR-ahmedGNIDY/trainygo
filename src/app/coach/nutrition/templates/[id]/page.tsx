import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getNutritionTemplate } from "@/lib/services/nutrition-templates";
import { saveNutritionTemplateBuilderAction } from "@/lib/actions/templates";
import { NutritionBuilder } from "@/components/builders/nutrition-builder";
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

  const tpl = await getNutritionTemplate(id, { role: "coach", coachId: ctx.coachId });
  if (!tpl || tpl.isSystemTemplate) notFound();

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
