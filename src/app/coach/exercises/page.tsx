import { requireRole } from "@/lib/auth/session";
import { coachCanWrite } from "@/lib/permissions";
import { listExercises } from "@/lib/services/exercises";
import { ExerciseLibrary, type ExerciseItem } from "@/components/library/exercise-library";

export const dynamic = "force-dynamic";

export default async function CoachExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const session = await requireRole("coach");
  const sp = await searchParams;
  const res = await listExercises(
    { role: "coach", coachId: session.user.id },
    { query: sp.q, category: sp.category, page: Number(sp.page) || 1 },
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
      canWrite={coachCanWrite(session.user.status)}
    />
  );
}
