import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ClientRequest, type IExerciseChangePayload } from "@/models/ClientRequest";
import { ClientProgram } from "@/models/ClientProgram";
import { User } from "@/models/User";
import { Exercise } from "@/models/Exercise";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { createNotification } from "@/lib/services/notifications";
import {
  EXERCISE_CHANGE_QUICK_REASON_LABELS,
} from "@/lib/i18n/labels";
import type {
  ExerciseChangeRequestData,
  ApproveExerciseChangeData,
} from "@/lib/validations/client-request";
import type { IWorkoutDay, IWorkoutExerciseEntry, IWorkoutWeek } from "@/models/WorkoutTemplate";

/**
 * Stable key identifying a single exercise slot inside a program, used to
 * detect an already-pending request for the same exercise (dedup) both on the
 * server (create guard) and on the client (disable the button).
 */
export function exerciseSlotKey(
  weekNumber: number,
  dayNumber: number,
  exerciseId: string | null | undefined,
  exerciseNameEn: string,
): string {
  return `${weekNumber}:${dayNumber}:${exerciseId || exerciseNameEn}`;
}

function keyOfPayload(p: IExerciseChangePayload): string {
  return exerciseSlotKey(
    p.weekNumber,
    p.dayNumber,
    p.exerciseId ? String(p.exerciseId) : null,
    p.exerciseNameEn,
  );
}

/** Locate the exercise entry the request refers to inside a program's embedded weeks. */
function findExerciseEntry(
  weeks: IWorkoutWeek[],
  weekNumber: number,
  dayNumber: number,
  exerciseId: string | null | undefined,
  exerciseNameEn: string,
): { day: IWorkoutDay; entry: IWorkoutExerciseEntry } | null {
  const week = weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;
  const entry =
    day.exercises.find((e) =>
      exerciseId && e.exercise ? String(e.exercise) === exerciseId : e.nameEn === exerciseNameEn,
    ) ?? null;
  return entry ? { day, entry } : null;
}

/**
 * Exercise slot keys of the client's CURRENTLY pending exercise-change
 * requests for a program. The workout UI uses this to disable a duplicate
 * request on the same exercise while one is still under review.
 */
export async function listPendingExerciseChangeKeys(
  clientId: string,
  programId: string,
): Promise<string[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(programId)) return [];
  const docs = await ClientRequest.find({
    client: new Types.ObjectId(clientId),
    program: new Types.ObjectId(programId),
    type: "exercise_change",
    status: "pending",
  })
    .select("payload")
    .lean();
  return docs.map((d) => keyOfPayload(d.payload));
}

/**
 * Create an exercise-change request from the client during a workout session.
 * Enforces the full tenancy chain server-side: client→coach, program→client,
 * exercise→program — no cross-tenant access, no trust in client-sent ids.
 */
export async function createExerciseChangeRequest(
  clientId: string,
  data: ExerciseChangeRequestData,
) {
  await connectToDatabase();

  // client → coach
  const client = await User.findOne({ _id: clientId, role: "client" })
    .select("name clientProfile.coach")
    .lean();
  const coachId = (client?.clientProfile as { coach?: Types.ObjectId } | undefined)?.coach;
  if (!client || !coachId) throw new PermissionError("لا يوجد مدرب", "NO_COACH");

  // program → client (scoped so a client can never target another client's program)
  const program = await ClientProgram.findOne({
    _id: data.programId,
    client: new Types.ObjectId(clientId),
  })
    .select("weeks nameAr nameEn coach")
    .lean();
  if (!program) throw new PermissionError("البرنامج غير موجود", "PROGRAM_NOT_FOUND");

  // exercise → program (must exist in the referenced week/day)
  const found = findExerciseEntry(
    program.weeks as IWorkoutWeek[],
    data.weekNumber,
    data.dayNumber,
    data.exerciseId,
    data.exerciseNameEn,
  );
  if (!found) throw new PermissionError("التمرين غير موجود في البرنامج", "EXERCISE_NOT_FOUND");

  // one pending request per exercise slot
  const slotKey = exerciseSlotKey(data.weekNumber, data.dayNumber, data.exerciseId, data.exerciseNameEn);
  const existing = await ClientRequest.find({
    client: new Types.ObjectId(clientId),
    program: new Types.ObjectId(data.programId),
    type: "exercise_change",
    status: "pending",
  })
    .select("payload")
    .lean();
  if (existing.some((d) => keyOfPayload(d.payload) === slotKey)) {
    throw new PermissionError("لديك طلب قيد المراجعة لهذا التمرين.", "DUPLICATE_PENDING");
  }

  const doc = await ClientRequest.create({
    type: "exercise_change",
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(String(coachId)),
    program: new Types.ObjectId(data.programId),
    quickReason: data.quickReason,
    reason: data.reason?.trim() || undefined,
    status: "pending",
    payload: {
      weekNumber: data.weekNumber,
      dayNumber: data.dayNumber,
      exerciseId: data.exerciseId ? new Types.ObjectId(data.exerciseId) : null,
      exerciseNameAr: data.exerciseNameAr,
      exerciseNameEn: data.exerciseNameEn,
    },
  });

  const quickReasonAr = data.quickReason
    ? EXERCISE_CHANGE_QUICK_REASON_LABELS[data.quickReason].ar
    : "";
  const quickReasonEn = data.quickReason
    ? EXERCISE_CHANGE_QUICK_REASON_LABELS[data.quickReason].en
    : "";

  await createNotification({
    recipient: String(coachId),
    type: "exercise_change_request",
    titleAr: "طلب تغيير تمرين",
    titleEn: "Exercise change request",
    bodyAr: `قام العميل ${client.name} بطلب تغيير تمرين ${data.exerciseNameAr}${quickReasonAr ? ` — ${quickReasonAr}` : ""}`,
    bodyEn: `${client.name} requested to change the exercise ${data.exerciseNameEn}${quickReasonEn ? ` — ${quickReasonEn}` : ""}`,
    link: `/coach/exercise-change-requests`,
  });

  return { id: doc._id.toString() };
}

export interface CoachRequestListOpts {
  type?: string;
  status?: "pending" | "approved" | "rejected";
  clientId?: string;
  limit?: number;
}

/** All requests belonging to a coach's clients (newest first). */
export async function listRequestsForCoach(coachId: string, opts: CoachRequestListOpts = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  filter.type = opts.type ?? "exercise_change";
  if (opts.status) filter.status = opts.status;
  if (opts.clientId && Types.ObjectId.isValid(opts.clientId)) {
    filter.client = new Types.ObjectId(opts.clientId);
  }
  const docs = await ClientRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Math.max(1, opts.limit ?? 200)))
    .populate("client", "name")
    .populate("program", "nameAr nameEn")
    .lean();
  return serialize(docs);
}

async function findResolvableRequest(coachId: string, requestId: string) {
  if (!Types.ObjectId.isValid(requestId)) return null;
  return ClientRequest.findOne({
    _id: requestId,
    coach: new Types.ObjectId(coachId),
    type: "exercise_change",
  });
}

/**
 * Approve an exercise-change request: swap the exercise ONLY inside the
 * assigned ClientProgram (never templates or the library), then resolve the
 * request and notify the client. The replacement's sets/reps/rest are kept
 * from the original slot — only the exercise identity changes.
 */
export async function approveExerciseChangeRequest(
  coachId: string,
  resolvedByUserId: string,
  requestId: string,
  data: ApproveExerciseChangeData,
) {
  await connectToDatabase();

  const request = await findResolvableRequest(coachId, requestId);
  if (!request) throw new PermissionError("الطلب غير موجود", "REQUEST_NOT_FOUND");
  if (request.status !== "pending") throw new PermissionError("تم البت في هذا الطلب مسبقاً", "ALREADY_RESOLVED");

  // Validate the replacement exercise is one the coach may use (system or their own custom).
  const replacement = await Exercise.findOne({
    _id: data.replacementExerciseId,
    $or: [{ isSystemExercise: true }, { createdByCoach: new Types.ObjectId(coachId) }],
  })
    .select("nameAr nameEn")
    .lean();
  if (!replacement) throw new PermissionError("التمرين البديل غير متاح", "REPLACEMENT_NOT_FOUND");

  // Load the FULL program doc (coach-scoped) so we can mutate & save the embedded entry.
  const program = await ClientProgram.findOne({
    _id: request.program,
    coach: new Types.ObjectId(coachId),
  });
  if (!program) throw new PermissionError("البرنامج غير موجود", "PROGRAM_NOT_FOUND");

  const found = findExerciseEntry(
    program.weeks as IWorkoutWeek[],
    request.payload.weekNumber,
    request.payload.dayNumber,
    request.payload.exerciseId ? String(request.payload.exerciseId) : null,
    request.payload.exerciseNameEn,
  );
  if (!found) throw new PermissionError("التمرين لم يعد موجوداً في البرنامج", "EXERCISE_NOT_FOUND");

  // Swap exercise identity in place; keep sets/reps/rest/tempo/order/notes.
  found.entry.exercise = new Types.ObjectId(data.replacementExerciseId);
  found.entry.nameAr = replacement.nameAr;
  found.entry.nameEn = replacement.nameEn;
  program.markModified("weeks");
  await program.save();

  request.status = "approved";
  request.coachNote = data.coachNote?.trim() || undefined;
  request.resolvedAt = new Date();
  request.resolvedBy = new Types.ObjectId(resolvedByUserId);
  request.payload.replacementExerciseId = new Types.ObjectId(data.replacementExerciseId);
  request.payload.replacementExerciseNameAr = replacement.nameAr;
  request.payload.replacementExerciseNameEn = replacement.nameEn;
  request.markModified("payload");
  await request.save();

  const note = data.coachNote?.trim();
  await createNotification({
    recipient: String(request.client),
    type: "exercise_change_resolved",
    titleAr: "طلب تغيير التمرين",
    titleEn: "Exercise change request",
    bodyAr: `تم تغيير التمرين بواسطة المدرب.${note ? ` ملاحظة المدرب: ${note}` : ""}`,
    bodyEn: `Your coach changed the exercise.${note ? ` Coach's note: ${note}` : ""}`,
    link: `/client/workout`,
  });

  return { id: request._id.toString() };
}

/** Reject an exercise-change request with an optional coach note, then notify the client. */
export async function rejectExerciseChangeRequest(
  coachId: string,
  resolvedByUserId: string,
  requestId: string,
  coachNote?: string,
) {
  await connectToDatabase();

  const request = await findResolvableRequest(coachId, requestId);
  if (!request) throw new PermissionError("الطلب غير موجود", "REQUEST_NOT_FOUND");
  if (request.status !== "pending") throw new PermissionError("تم البت في هذا الطلب مسبقاً", "ALREADY_RESOLVED");

  const note = coachNote?.trim();
  request.status = "rejected";
  request.coachNote = note || undefined;
  request.resolvedAt = new Date();
  request.resolvedBy = new Types.ObjectId(resolvedByUserId);
  await request.save();

  await createNotification({
    recipient: String(request.client),
    type: "exercise_change_resolved",
    titleAr: "طلب تغيير التمرين",
    titleEn: "Exercise change request",
    bodyAr: `تم رفض طلب تغيير التمرين.${note ? ` ملاحظة المدرب: ${note}` : ""}`,
    bodyEn: `Your exercise change request was rejected.${note ? ` Coach's note: ${note}` : ""}`,
    link: `/client/workout`,
  });

  return { id: request._id.toString() };
}

export interface ExerciseChangeAnalytics {
  pending: number;
  approved: number;
  rejected: number;
  /** Average coach response time in hours (over resolved requests), or null. */
  avgResponseHours: number | null;
  topExercises: { nameAr: string; nameEn: string; count: number }[];
  topQuickReasons: { key: string; count: number }[];
}

/** Aggregate stats for the coach's exercise-change dashboard. */
export async function getExerciseChangeAnalytics(coachId: string): Promise<ExerciseChangeAnalytics> {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const base = { coach, type: "exercise_change" as const };

  const [pending, approved, rejected, resolvedAgg, exAgg, reasonAgg] = await Promise.all([
    ClientRequest.countDocuments({ ...base, status: "pending" }),
    ClientRequest.countDocuments({ ...base, status: "approved" }),
    ClientRequest.countDocuments({ ...base, status: "rejected" }),
    ClientRequest.aggregate<{ _id: null; avgMs: number }>([
      { $match: { ...base, resolvedAt: { $ne: null } } },
      { $project: { ms: { $subtract: ["$resolvedAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$ms" } } },
    ]),
    ClientRequest.aggregate<{ _id: string; nameAr: string; nameEn: string; count: number }>([
      { $match: base },
      {
        $group: {
          _id: "$payload.exerciseNameEn",
          nameAr: { $first: "$payload.exerciseNameAr" },
          nameEn: { $first: "$payload.exerciseNameEn" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    ClientRequest.aggregate<{ _id: string; count: number }>([
      { $match: { ...base, quickReason: { $ne: null } } },
      { $group: { _id: "$quickReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
  ]);

  const avgMs = resolvedAgg[0]?.avgMs;
  return {
    pending,
    approved,
    rejected,
    avgResponseHours: avgMs != null ? Math.round((avgMs / 3_600_000) * 10) / 10 : null,
    topExercises: exAgg.map((e) => ({ nameAr: e.nameAr, nameEn: e.nameEn, count: e.count })),
    topQuickReasons: reasonAgg.filter((r) => r._id).map((r) => ({ key: r._id, count: r.count })),
  };
}

/** Exercise-change history for one client, coach-scoped (for the client profile card). */
export async function listExerciseChangeHistoryForClient(coachId: string, clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return [];
  const docs = await ClientRequest.find({
    coach: new Types.ObjectId(coachId),
    client: new Types.ObjectId(clientId),
    type: "exercise_change",
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return serialize(docs);
}
