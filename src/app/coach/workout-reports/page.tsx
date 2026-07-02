import { requireCoachArea } from "@/lib/auth/session";
import { canAccessReports } from "@/lib/permissions/team";
import { listReportsForCoach } from "@/lib/services/workout-reports";
import { WorkoutReportsView, type ReportRow } from "./workout-reports-view";

export const dynamic = "force-dynamic";

export default async function WorkoutReportsPage() {
  const ctx = await requireCoachArea(canAccessReports);
  const raw = await listReportsForCoach(ctx.coachId);

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
