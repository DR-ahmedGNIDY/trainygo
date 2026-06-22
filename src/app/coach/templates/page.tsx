import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listWorkoutTemplates } from "@/lib/services/workout-templates";
import { WorkoutTemplatesView, type WorkoutTplItem } from "./templates-view";

export const dynamic = "force-dynamic";

export default async function WorkoutTemplatesPage() {
  const session = await requireRole("coach");
  const raw = await listWorkoutTemplates({ role: "coach", coachId: session.user.id });
  const items: WorkoutTplItem[] = raw.map((tpl) => ({
    id: String(tpl._id),
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    goal: tpl.goal as WorkoutTplItem["goal"],
    weeks: tpl.weeks?.length ?? 0,
    days: (tpl.weeks ?? []).reduce((s, w) => s + (w.days?.length ?? 0), 0),
    isSystem: tpl.isSystemTemplate,
  }));
  return <WorkoutTemplatesView items={items} canWrite={coachCanWrite(session.user.status)} />;
}
