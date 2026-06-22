import { requireRole } from "@/lib/auth/session";
import { listExercises } from "@/lib/services/exercises";
import { ExerciseLibrary, type ExerciseItem } from "@/components/library/exercise-library";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  await requireRole("super_admin");
  const sp = await searchParams;
  const res = await listExercises(
    { role: "super_admin" },
    { query: sp.q, category: sp.category, page: Number(sp.page) || 1 },
  );
  return (
    <ExerciseLibrary
      role="super_admin"
      items={res.items as unknown as ExerciseItem[]}
      total={res.total}
      page={res.page}
      pages={res.pages}
      query={sp.q ?? ""}
      category={sp.category ?? "all"}
      canWrite
    />
  );
}
