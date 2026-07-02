import { notFound, redirect } from "next/navigation";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessWorkout } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { getProgram } from "@/lib/services/programs";
import { saveProgramBuilderAction } from "@/lib/actions/programs";
import { WorkoutBuilder, type BWeek } from "@/components/builders/workout-builder";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";

export const dynamic = "force-dynamic";

export default async function ProgramBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCoachArea(canAccessWorkout);
  if (!coachCanWrite(ctx.status)) redirect("/coach/subscription");

  const program = await getProgram(ctx.coachId, id);
  if (!program) notFound();
  const clientName = (program.client as unknown as { name?: string })?.name ?? "";

  async function save(data: { nameAr: string; nameEn: string; weeks: BWeek[] }) {
    "use server";
    return saveProgramBuilderAction(id, {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      weeks: data.weeks as unknown as IWorkoutWeek[],
    });
  }

  return (
    <WorkoutBuilder
      backHref="/coach/programs"
      title="برامج العملاء"
      subtitle={clientName ? `${clientName} — نسخة مستقلة (تعديلها لا يؤثر على القالب)` : undefined}
      initialNameAr={program.nameAr}
      initialNameEn={program.nameEn}
      initialWeeks={program.weeks as unknown as BWeek[]}
      onSave={save}
    />
  );
}
