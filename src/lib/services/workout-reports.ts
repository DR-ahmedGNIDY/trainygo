import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutReport } from "@/models/WorkoutReport";
import { serialize } from "@/lib/serialize";
import { logExercise } from "@/lib/services/workout-logs";
import type { WorkoutReportData } from "@/lib/validations/workout-report";

/**
 * Persist a finished workout session as a coach-visible report, and also
 * write one WorkoutLog per completed exercise so existing PR/history
 * tracking keeps working unchanged.
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

  const exercises = data.exercises.map((ex) => ({
    exercise: ex.exerciseId ? new Types.ObjectId(ex.exerciseId) : null,
    nameAr: ex.nameAr,
    nameEn: ex.nameEn,
    targetSets: ex.targetSets,
    targetReps: ex.targetReps,
    sets: ex.sets,
    wasDeferred: ex.wasDeferred,
  }));

  const completedCount = exercises.filter((e) => e.sets.length > 0).length;
  const deferredCount = exercises.filter((e) => e.wasDeferred).length;

  const doc = await WorkoutReport.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    program: data.programId ? new Types.ObjectId(data.programId) : null,
    weekNumber: data.weekNumber,
    dayNumber: data.dayNumber,
    dayNameAr: data.dayNameAr,
    dayNameEn: data.dayNameEn,
    startedAt,
    endedAt,
    durationSeconds,
    exercises,
    completedCount,
    deferredCount,
  });

  await Promise.all(
    data.exercises
      .filter((ex) => ex.sets.length > 0)
      .map((ex) =>
        logExercise(clientId, coachId, {
          exerciseId: ex.exerciseId,
          exerciseNameAr: ex.nameAr,
          exerciseNameEn: ex.nameEn,
          programId: data.programId,
          weekNumber: data.weekNumber,
          dayNumber: data.dayNumber,
          sets: ex.sets,
          completed: true,
          date: endedAt,
        }),
      ),
  );

  return { id: doc._id.toString() };
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
