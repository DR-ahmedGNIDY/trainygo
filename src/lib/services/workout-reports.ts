import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutReport } from "@/models/WorkoutReport";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { logExercise } from "@/lib/services/workout-logs";
import type { ComparisonStatus } from "@/models/WorkoutLog";
import { createNotification } from "@/lib/services/notifications";
import type { WorkoutReportData } from "@/lib/validations/workout-report";

/** The heaviest set in a list (ties broken by reps) — used for PR notification text. */
function bestSet(sets: { setNumber: number; weight: number; reps: number }[]) {
  return sets.reduce<{ setNumber: number; weight: number; reps: number } | null>((best, s) => {
    if (!best) return s;
    if (s.weight > best.weight) return s;
    if (s.weight === best.weight && s.reps > best.reps) return s;
    return best;
  }, null);
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Builds a wa.me deep link with a prefilled summary, or null if the coach has no WhatsApp number on file. */
function buildWhatsAppLink(
  whatsappNumber: string | undefined,
  params: {
    clientName: string;
    programName: string;
    dayName: string;
    date: Date;
    durationSeconds: number;
    totalRestSeconds: number;
    completedCount: number;
    deferredCount: number;
    skippedCount: number;
    exercises: { nameAr: string; sets: { weight: number; reps: number }[]; skipped: boolean }[];
  },
): string | null {
  if (!whatsappNumber) return null;
  const digits = whatsappNumber.replace(/[^\d]/g, "");
  if (!digits) return null;

  const setsSummary = params.exercises
    .filter((e) => !e.skipped && e.sets.length > 0)
    .map((e) => `${e.nameAr}: ${e.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")}`)
    .join("\n");

  const text = [
    `تقرير جلسة تمرين — ${params.clientName}`,
    params.programName ? `البرنامج: ${params.programName}` : "",
    `اليوم: ${params.dayName}`,
    `التاريخ: ${params.date.toLocaleDateString("en-GB")}`,
    `مدة الجلسة: ${formatDuration(params.durationSeconds)}`,
    `مدة الراحة: ${formatDuration(params.totalRestSeconds)}`,
    `مكتمل: ${params.completedCount} · مؤجل: ${params.deferredCount} · متخطى: ${params.skippedCount}`,
    setsSummary ? `\nالتفاصيل:\n${setsSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Persist a finished workout session as a coach-visible report, write one
 * WorkoutLog per completed exercise (existing PR/history tracking), notify
 * the coach in-app, and return a ready-to-send WhatsApp deep link.
 */
export async function createWorkoutReport(
  clientId: string,
  coachId: string,
  data: WorkoutReportData,
) {
  await connectToDatabase();

  const startedAt = new Date(data.startedAt);
  const endedAt = new Date(data.endedAt);
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

  // Log each completed exercise first so we know, per exercise, how it compares to the
  // client's previous session and whether it set a new personal record.
  const logResults = new Map<
    number,
    {
      comparisonStatus: ComparisonStatus;
      isPr: boolean;
      previous: { sets: { setNumber: number; weight: number; reps: number }[]; estimatedOneRm: number } | null;
      declineStreak: boolean;
    }
  >();
  await Promise.all(
    data.exercises.map(async (ex, i) => {
      if (ex.skipped || ex.sets.length === 0) return;
      const result = await logExercise(clientId, coachId, {
        exerciseId: ex.exerciseId,
        exerciseNameAr: ex.nameAr,
        exerciseNameEn: ex.nameEn,
        programId: data.programId,
        weekNumber: data.weekNumber,
        dayNumber: data.dayNumber,
        sets: ex.sets,
        completed: true,
        date: endedAt,
        difficultyRating: ex.difficultyRating,
      });
      logResults.set(i, result);
    }),
  );

  const exercises = data.exercises.map((ex, i) => {
    const cmp = logResults.get(i);
    return {
      exercise: ex.exerciseId ? new Types.ObjectId(ex.exerciseId) : null,
      nameAr: ex.nameAr,
      nameEn: ex.nameEn,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      sets: ex.sets,
      wasDeferred: ex.wasDeferred,
      skipped: ex.skipped,
      comparisonStatus: cmp?.comparisonStatus ?? null,
      isPr: cmp?.isPr ?? false,
      previousSets: cmp?.previous?.sets ?? [],
      previousOneRm: cmp?.previous?.estimatedOneRm ?? null,
    };
  });

  const skippedCount = exercises.filter((e) => e.skipped).length;
  const completedCount = exercises.filter((e) => !e.skipped).length;
  const deferredCount = exercises.filter((e) => e.wasDeferred && !e.skipped).length;

  const [doc, client, coach] = await Promise.all([
    WorkoutReport.create({
      client: new Types.ObjectId(clientId),
      coach: new Types.ObjectId(coachId),
      program: data.programId ? new Types.ObjectId(data.programId) : null,
      programName: data.programName,
      weekNumber: data.weekNumber,
      dayNumber: data.dayNumber,
      dayNameAr: data.dayNameAr,
      dayNameEn: data.dayNameEn,
      startedAt,
      endedAt,
      durationSeconds,
      totalRestSeconds: data.totalRestSeconds ?? 0,
      exercises,
      completedCount,
      deferredCount,
      skippedCount,
    }),
    User.findById(clientId).select("name").lean(),
    User.findById(coachId).select("coachProfile.whatsappNumber").lean(),
  ]);

  const prExercises = exercises.filter((e) => e.isPr);
  const decliningExercises = data.exercises.filter((_, i) => logResults.get(i)?.declineStreak);

  await Promise.all([
    createNotification({
      recipient: coachId,
      type: "workout_report",
      titleAr: `تقرير تمرين جديد: ${client?.name ?? ""}`,
      titleEn: `New workout report: ${client?.name ?? ""}`,
      link: `/coach/workout-reports/${doc._id.toString()}`,
    }),
    ...prExercises.map((ex) => {
      const top = bestSet(ex.sets);
      const prevTop = bestSet(ex.previousSets);
      const newDesc = top ? `${top.weight}kg × ${top.reps}` : "";
      const oldDesc = prevTop ? `${prevTop.weight}kg × ${prevTop.reps}` : "";
      return createNotification({
        recipient: coachId,
        type: "personal_record",
        titleAr: `🏆 ${client?.name ?? ""} حقق رقماً قياسياً جديداً في ${ex.nameAr}`,
        titleEn: `🏆 ${client?.name ?? ""} set a new personal record in ${ex.nameEn}`,
        bodyAr: oldDesc ? `${newDesc} بدلاً من ${oldDesc}` : newDesc,
        bodyEn: oldDesc ? `${newDesc} instead of ${oldDesc}` : newDesc,
        link: `/coach/workout-reports/${doc._id.toString()}`,
      });
    }),
    ...decliningExercises.map((ex) =>
      createNotification({
        recipient: coachId,
        type: "performance_decline",
        titleAr: `⚠️ انخفاض أداء ${client?.name ?? ""} في ${ex.nameAr} لـ 3 جلسات متتالية`,
        titleEn: `⚠️ ${client?.name ?? ""}'s performance in ${ex.nameEn} has declined for 3 sessions in a row`,
        bodyAr: "قد يكون اللاعب مرهقاً أو يحتاج تعديل البرنامج.",
        bodyEn: "The client may be fatigued or need a program adjustment.",
        link: `/coach/workout-reports/${doc._id.toString()}`,
      }),
    ),
  ]);

  const whatsappLink = buildWhatsAppLink(coach?.coachProfile?.whatsappNumber, {
    clientName: client?.name ?? "",
    programName: data.programName ?? "",
    dayName: data.dayNameAr,
    date: endedAt,
    durationSeconds,
    totalRestSeconds: data.totalRestSeconds ?? 0,
    completedCount,
    deferredCount,
    skippedCount,
    exercises: exercises.map((e) => ({ nameAr: e.nameAr, sets: e.sets, skipped: e.skipped })),
  });

  return { id: doc._id.toString(), whatsappLink };
}

export async function listReportsForCoach(coachId: string, limit = 50) {
  await connectToDatabase();
  const docs = await WorkoutReport.find({ coach: new Types.ObjectId(coachId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("client", "name")
    .lean();
  return serialize(docs);
}

export async function getReportForCoach(coachId: string, reportId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(reportId)) return null;
  const doc = await WorkoutReport.findOne({ _id: reportId, coach: new Types.ObjectId(coachId) })
    .populate("client", "name")
    .lean();
  return doc ? serialize(doc) : null;
}

export async function listReportsForClient(clientId: string, limit = 100) {
  await connectToDatabase();
  const docs = await WorkoutReport.find({ client: new Types.ObjectId(clientId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return serialize(docs);
}

export async function getReportForClient(clientId: string, reportId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(reportId)) return null;
  const doc = await WorkoutReport.findOne({ _id: reportId, client: new Types.ObjectId(clientId) }).lean();
  return doc ? serialize(doc) : null;
}
