import { requireCoachArea } from "@/lib/auth/session";
import { canAccessExercises } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listExercises } from "@/lib/services/exercises";
import { ExerciseLibrary, type ExerciseItem } from "@/components/library/exercise-library";

export const dynamic = "force-dynamic";

export default async function CoachExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; tab?: string }>;
}) {
  const ctx = await requireCoachArea(canAccessExercises);
  const sp = await searchParams;
  const tab = sp.tab === "mine" ? "mine" : "system";
  const res = await listExercises(
    { role: "coach", coachId: ctx.coachId },
    { query: sp.q, category: sp.category, visibility: tab, page: Number(sp.page) || 1 },
  );
  return (
    <ExerciseLibrary
      role="coach"
      items={res.items as unknown as ExerciseItem[]}
      total={res.total}
      page={res.page}
      pages={res.pages}
      query={sp.q ?? ""}
      category={sp.category ?? "all"}
      tab={tab}
      canWrite={coachCanWrite(ctx.status)}
    />
  );
}
