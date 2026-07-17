import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getWorkoutTemplate } from "@/lib/services/workout-templates";
import {
  cloneWorkoutTemplateAction,
  saveWorkoutTemplateBuilderAction,
} from "@/lib/actions/templates";
import { WorkoutBuilder, type BWeek } from "@/components/builders/workout-builder";
import {
  WorkoutTemplatePreview,
  type PreviewWeek,
} from "@/components/templates/template-preview";
import { isOfficialTemplate } from "@/lib/templates";
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

  // The service already scoped this to "own or global", so a hit here is never
  // another coach's template.
  const tpl = await getWorkoutTemplate(id, { role: "coach", coachId: ctx.coachId });
  if (!tpl) notFound();

  // Official templates are read-only for a coach — preview + duplicate instead.
  if (isOfficialTemplate(tpl)) {
    async function duplicate() {
      "use server";
      return cloneWorkoutTemplateAction(id);
    }
    return (
      <WorkoutTemplatePreview
        backHref="/coach/templates"
        duplicateHref="/coach/templates"
        title="قوالب التمارين"
        nameAr={tpl.nameAr}
        nameEn={tpl.nameEn}
        weeks={tpl.weeks as unknown as PreviewWeek[]}
        onDuplicate={duplicate}
      />
    );
  }

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
