import { requireRole } from "@/lib/auth/session";
import { listReportsForClient } from "@/lib/services/workout-reports";
import { WorkoutHistoryView, type HistoryRow } from "./workout-history-view";

export const dynamic = "force-dynamic";

export default async function WorkoutHistoryPage() {
  const session = await requireRole("client");
  const raw = await listReportsForClient(session.user.id);

  const rows: HistoryRow[] = (
    raw as unknown as {
      _id: string;
      dayNameAr: string;
      dayNameEn: string;
      startedAt: string;
      endedAt: string;
      durationSeconds: number;
      totalRestSeconds: number;
      completedCount: number;
      deferredCount: number;
      skippedCount: number;
      exercises: { sets: unknown[] }[];
    }[]
  ).map((r) => ({
    id: r._id,
    dayNameAr: r.dayNameAr,
    dayNameEn: r.dayNameEn,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    durationSeconds: r.durationSeconds,
    totalRestSeconds: r.totalRestSeconds,
    exerciseCount: r.exercises.length,
    completedCount: r.completedCount,
    deferredCount: r.deferredCount,
    skippedCount: r.skippedCount,
    totalSets: r.exercises.reduce((sum, e) => sum + e.sets.length, 0),
  }));

  return <WorkoutHistoryView rows={rows} />;
}
