import { requireRole } from "@/lib/auth/session";
import { listWorkoutTemplates } from "@/lib/services/workout-templates";
import { isOfficialTemplate } from "@/lib/templates";
import {
  WorkoutTemplatesView,
  type WorkoutTplItem,
} from "@/app/coach/templates/templates-view";

export const dynamic = "force-dynamic";

/**
 * Global Workout Templates — the super admin's authoring surface.
 *
 * Same view and builder the coach uses; the only difference is the scope, which
 * marks everything created here as isSystemTemplate (official) and therefore
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
    official: isOfficialTemplate(tpl),
    // Both fields postdate the earliest templates, hence the defaults.
    featured: tpl.featured ?? false,
    version: tpl.version ?? 1,
  }));
  return (
    <WorkoutTemplatesView items={items} canWrite basePath="/admin/templates" isAdmin />
  );
}
