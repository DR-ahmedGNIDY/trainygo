import { requireCoachArea } from "@/lib/auth/session";
import { canAccessWorkout, canManageClients, type TeamPermissionContext } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import {
  listRequestsForCoach,
  getExerciseChangeAnalytics,
} from "@/lib/services/client-requests";
import {
  ExerciseChangeRequestsView,
  type RequestRow,
} from "./exercise-change-requests-view";

export const dynamic = "force-dynamic";

/** Fitness/assistant coaches (canAccessWorkout) manage requests; academy managers (canManageClients) may view. */
const canViewRequests = (ctx: TeamPermissionContext) =>
  canAccessWorkout(ctx) || canManageClients(ctx);

export default async function ExerciseChangeRequestsPage() {
  const ctx = await requireCoachArea(canViewRequests);
  const [raw, analytics] = await Promise.all([
    listRequestsForCoach(ctx.coachId, { type: "exercise_change" }),
    getExerciseChangeAnalytics(ctx.coachId),
  ]);

  const rows: RequestRow[] = (
    raw as unknown as {
      _id: string;
      status: RequestRow["status"];
      quickReason?: string;
      reason?: string;
      coachNote?: string;
      createdAt: string;
      resolvedAt?: string | null;
      client?: { name?: string };
      program?: { nameAr?: string; nameEn?: string };
      payload: {
        weekNumber: number;
        dayNumber: number;
        exerciseNameAr: string;
        exerciseNameEn: string;
        replacementExerciseNameAr?: string;
        replacementExerciseNameEn?: string;
      };
    }[]
  ).map((r) => ({
    id: r._id,
    status: r.status,
    quickReason: r.quickReason,
    reason: r.reason ?? "",
    coachNote: r.coachNote ?? "",
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt ?? null,
    clientName: r.client?.name ?? "—",
    programNameAr: r.program?.nameAr ?? "",
    programNameEn: r.program?.nameEn ?? "",
    weekNumber: r.payload.weekNumber,
    dayNumber: r.payload.dayNumber,
    exerciseNameAr: r.payload.exerciseNameAr,
    exerciseNameEn: r.payload.exerciseNameEn,
    replacementNameAr: r.payload.replacementExerciseNameAr ?? "",
    replacementNameEn: r.payload.replacementExerciseNameEn ?? "",
  }));

  // Only fitness/assistant coaches with write access may act; academy managers view only.
  const canApprove = canAccessWorkout(ctx) && coachCanWrite(ctx.status);

  return (
    <ExerciseChangeRequestsView rows={rows} analytics={analytics} canApprove={canApprove} />
  );
}
