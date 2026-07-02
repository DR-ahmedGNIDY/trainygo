import { requireCoachArea } from "@/lib/auth/session";
import { canAccessTemplates } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listWorkoutTemplates } from "@/lib/services/workout-templates";
import { WorkoutTemplatesView, type WorkoutTplItem } from "./templates-view";

export const dynamic = "force-dynamic";

export default async function WorkoutTemplatesPage() {
  const ctx = await requireCoachArea(canAccessTemplates);
  const raw = await listWorkoutTemplates({ role: "coach", coachId: ctx.coachId });
  const items: WorkoutTplItem[] = raw.map((tpl) => ({
    id: String(tpl._id),
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    goal: tpl.goal as WorkoutTplItem["goal"],
    weeks: tpl.weeks?.length ?? 0,
    days: (tpl.weeks ?? []).reduce((s, w) => s + (w.days?.length ?? 0), 0),
    isSystem: tpl.isSystemTemplate,
  }));
  return <WorkoutTemplatesView items={items} canWrite={coachCanWrite(ctx.status)} />;
}
