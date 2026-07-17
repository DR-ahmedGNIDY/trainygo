import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getWorkoutTemplate } from "@/lib/services/workout-templates";
import { saveWorkoutTemplateBuilderAction } from "@/lib/actions/templates";
import { WorkoutBuilder, type BWeek } from "@/components/builders/workout-builder";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";

export const dynamic = "force-dynamic";

/** Global workout template builder — the exact builder coaches use. */
export default async function AdminWorkoutTemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("super_admin");

  // The super_admin scope only resolves global templates, so a coach's private
  // template can never be opened here.
  const tpl = await getWorkoutTemplate(id, { role: "super_admin" });
  if (!tpl) notFound();

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
      backHref="/admin/templates"
      title="قوالب التمارين العامة"
      initialNameAr={tpl.nameAr}
      initialNameEn={tpl.nameEn}
      initialWeeks={tpl.weeks as unknown as BWeek[]}
      onSave={save}
      flat
    />
  );
}
