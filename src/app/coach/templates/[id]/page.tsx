import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getWorkoutTemplate } from "@/lib/services/workout-templates";
import { saveWorkoutTemplateBuilderAction } from "@/lib/actions/templates";
import { WorkoutBuilder, type BWeek } from "@/components/builders/workout-builder";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";

export const dynamic = "force-dynamic";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canAccessTemplates);
  if (!coachCanWrite(ctx.status)) redirect("/coach/subscription");

  const tpl = await getWorkoutTemplate(id, { role: "coach", coachId: ctx.coachId });
  if (!tpl || tpl.isSystemTemplate) notFound();

  async function save(data: { nameAr: string; nameEn: string; weeks: BWeek[] }) {
    "use server";
    return saveWorkoutTemplateBuilderAction(id, {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      weeks: data.weeks as unknown as IWorkoutWeek[],
    });
  }

  return (
    <WorkoutBuilder
      backHref="/coach/templates"
      title="قوالب التمارين"
      initialNameAr={tpl.nameAr}
      initialNameEn={tpl.nameEn}
      initialWeeks={tpl.weeks as unknown as BWeek[]}
      onSave={save}
      flat
    />
  );
}
