import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getNutritionTemplate } from "@/lib/services/nutrition-templates";
import { saveNutritionTemplateBuilderAction } from "@/lib/actions/templates";
import { NutritionBuilder } from "@/components/builders/nutrition-builder";
import { mealsToBuilder } from "@/lib/builder-mappers";
import type { IMeal } from "@/models/NutritionTemplate";

export const dynamic = "force-dynamic";

/** Global nutrition template builder — the exact builder coaches use. */
export default async function AdminNutritionTemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("super_admin");

  // The super_admin scope only resolves global templates, so a coach's private
  // template can never be opened here.
  const tpl = await getNutritionTemplate(id, { role: "super_admin" });
  if (!tpl) notFound();

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
      backHref="/admin/nutrition-templates"
      title="قوالب التغذية العامة"
      initialNameAr={tpl.nameAr}
      initialNameEn={tpl.nameEn}
      initialMeals={mealsToBuilder(tpl.meals as unknown as IMeal[])}
      onSave={save}
    />
  );
}
