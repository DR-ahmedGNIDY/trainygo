import { requireRole } from "@/lib/auth/session";
import { listReportsForCoach } from "@/lib/services/workout-reports";
import { WorkoutReportsView, type ReportRow } from "./workout-reports-view";

export const dynamic = "force-dynamic";

export default async function WorkoutReportsPage() {
  const session = await requireRole("coach");
  const raw = await listReportsForCoach(session.user.id);

  const rows: ReportRow[] = (
    raw as unknown as {
      _id: string;
      client?: { name?: string };
      dayNameAr: string;
      dayNameEn: string;
      startedAt: string;
      durationSeconds: number;
      completedCount: number;
      deferredCount: number;
      skippedCount: number;
    }[]
  ).map((r) => ({
    id: r._id,
    clientName: r.client?.name ?? "—",
    dayNameAr: r.dayNameAr,
    dayNameEn: r.dayNameEn,
    date: new Date(r.startedAt).toISOString().slice(0, 10),
    durationSeconds: r.durationSeconds,
    completedCount: r.completedCount,
    deferredCount: r.deferredCount,
    skippedCount: r.skippedCount,
  }));

  return <WorkoutReportsView rows={rows} />;
}
