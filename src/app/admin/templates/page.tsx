import { requireRole } from "@/lib/auth/session";
import { listWorkoutTemplates } from "@/lib/services/workout-templates";
import { resolveCreatorType } from "@/models/template-creator";
import {
  WorkoutTemplatesView,
  type WorkoutTplItem,
} from "@/app/coach/templates/templates-view";

export const dynamic = "force-dynamic";

/**
 * Global Workout Templates — the super admin's authoring surface.
 *
 * Same view and builder the coach uses; the only difference is the scope, which
 * makes everything created here `createdByType: "super_admin"` and therefore
 * visible to every coach.
 */
export default async function AdminWorkoutTemplatesPage() {
  await requireRole("super_admin");
  const raw = await listWorkoutTemplates({ role: "super_admin" });
  const items: WorkoutTplItem[] = raw.map((tpl) => ({
    id: String(tpl._id),
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    goal: tpl.goal as WorkoutTplItem["goal"],
    weeks: tpl.weeks?.length ?? 0,
    days: (tpl.weeks ?? []).reduce((s, w) => s + (w.days?.length ?? 0), 0),
    createdByType: resolveCreatorType(tpl),
  }));
  return (
    <WorkoutTemplatesView items={items} canWrite basePath="/admin/templates" isAdmin />
  );
}
