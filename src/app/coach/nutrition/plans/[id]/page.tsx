import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessNutrition } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getNutritionPlan } from "@/lib/services/nutrition-plans";
import { savePlanBuilderAction } from "@/lib/actions/programs";
import { NutritionBuilder } from "@/components/builders/nutrition-builder";
import { mealsToBuilder } from "@/lib/builder-mappers";
import type { IMeal } from "@/models/NutritionTemplate";

export const dynamic = "force-dynamic";

export default async function NutritionPlanBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canAccessNutrition);
  if (!coachCanWrite(ctx.status)) redirect("/coach/subscription");

  const plan = await getNutritionPlan(ctx.coachId, id);
  if (!plan) notFound();
  const clientName = (plan.client as unknown as { name?: string })?.name ?? "";

  async function save(data: { nameAr: string; nameEn: string; meals: unknown[] }) {
    "use server";
    return savePlanBuilderAction(id, data.meals as IMeal[]);
  }

  return (
    <NutritionBuilder
      backHref="/coach/nutrition/plans"
      title="خطط تغذية العملاء"
      subtitle={clientName ? `${clientName} — نسخة مستقلة` : undefined}
      initialNameAr={plan.nameAr}
      initialNameEn={plan.nameEn}
      initialMeals={mealsToBuilder(plan.meals as unknown as IMeal[])}
      onSave={save}
    />
  );
}
