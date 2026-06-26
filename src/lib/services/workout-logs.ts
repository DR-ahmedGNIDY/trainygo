import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutLog, type ComparisonStatus } from "@/models/WorkoutLog";
import { serialize } from "@/lib/serialize";

export interface LoggedSetInput {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface PreviousPerformance {
  date: string;
  sets: LoggedSetInput[];
  estimatedOneRm: number;
}

/** Determines how a new performance compares to the previous one and the all-time best. */
export function comparePerformance(
  newOneRm: number,
  previous: PreviousPerformance | null,
  allTimeBestOneRm: number,
): ComparisonStatus {
  if (!previous) return "first_time";
  if (newOneRm > allTimeBestOneRm) return "pr";
  const delta = newOneRm - previous.estimatedOneRm;
  if (delta > 0.5) return "improved";
  if (delta < -0.5) return "decline";
  return "steady";
}

export interface LogExerciseInput {
  exerciseId?: string;
  exerciseNameAr: string;
  exerciseNameEn: string;
  programId?: string;
  weekNumber?: number;
  dayNumber?: number;
  sets: LoggedSetInput[];
  notes?: string;
  completed?: boolean;
  date?: Date;
}

/** Epley estimated one-rep max for a single set. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Best estimated 1RM across a set list. */
export function bestOneRm(sets: LoggedSetInput[]): number {
  return sets.reduce((max, s) => Math.max(max, epley1RM(s.weight, s.reps)), 0);
}

/** The client's most recent previous log for an exercise, before any given date. */
async function getPreviousLog(
  clientId: string,
  exerciseId: string,
  before?: Date,
): Promise<PreviousPerformance | null> {
  const doc = await WorkoutLog.findOne({
    client: new Types.ObjectId(clientId),
    exercise: new Types.ObjectId(exerciseId),
    ...(before ? { date: { $lt: before } } : {}),
  })
    .sort({ date: -1 })
    .lean();
  if (!doc) return null;
  return { date: doc.date.toISOString(), sets: doc.sets, estimatedOneRm: doc.estimatedOneRm };
}

/** The client's all-time best 1RM for an exercise, before any given date. */
async function getAllTimeBestOneRm(clientId: string, exerciseId: string, before?: Date): Promise<number> {
  const agg = await WorkoutLog.aggregate([
    {
      $match: {
        client: new Types.ObjectId(clientId),
        exercise: new Types.ObjectId(exerciseId),
        ...(before ? { date: { $lt: before } } : {}),
      },
    },
    { $group: { _id: null, max: { $max: "$estimatedOneRm" } } },
  ]);
  return agg[0]?.max ?? 0;
}

/** Record a client's exercise log. coachId derives from the client's coach. */
export async function logExercise(
  clientId: string,
  coachId: string,
  input: LogExerciseInput,
): Promise<{ id: string; comparisonStatus: ComparisonStatus; isPr: boolean; previous: PreviousPerformance | null }> {
  await connectToDatabase();
  const date = input.date ?? new Date();
  const newOneRm = bestOneRm(input.sets);

  let previous: PreviousPerformance | null = null;
  let allTimeBest = 0;
  if (input.exerciseId) {
    [previous, allTimeBest] = await Promise.all([
      getPreviousLog(clientId, input.exerciseId, date),
      getAllTimeBestOneRm(clientId, input.exerciseId, date),
    ]);
  }
  const comparisonStatus = comparePerformance(newOneRm, previous, allTimeBest);
  const isPr = comparisonStatus === "pr";

  const doc = await WorkoutLog.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    program: input.programId ? new Types.ObjectId(input.programId) : null,
    exercise: input.exerciseId ? new Types.ObjectId(input.exerciseId) : null,
    exerciseNameAr: input.exerciseNameAr,
    exerciseNameEn: input.exerciseNameEn,
    weekNumber: input.weekNumber,
    dayNumber: input.dayNumber,
    date,
    sets: input.sets,
    notes: input.notes,
    completed: input.completed ?? true,
    estimatedOneRm: newOneRm,
    isPr,
    comparisonStatus,
  });
  return { id: doc._id.toString(), comparisonStatus, isPr, previous };
}

/** Most recent previous performance for each given exercise (for the "last time" card during a session). */
export async function getLastPerformanceMap(
  clientId: string,
  exerciseIds: string[],
): Promise<Record<string, PreviousPerformance>> {
  await connectToDatabase();
  const ids = [...new Set(exerciseIds)].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return {};
  const docs = await WorkoutLog.aggregate([
    { $match: { client: new Types.ObjectId(clientId), exercise: { $in: ids } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: "$exercise",
        date: { $first: "$date" },
        sets: { $first: "$sets" },
        estimatedOneRm: { $first: "$estimatedOneRm" },
      },
    },
  ]);
  const map: Record<string, PreviousPerformance> = {};
  for (const d of docs) {
    map[String(d._id)] = { date: d.date.toISOString(), sets: d.sets, estimatedOneRm: d.estimatedOneRm };
  }
  return map;
}

/** All logs whose exercise name matches a search query (Arabic or English), oldest first — for progress charts. */
export async function getExerciseHistoryByName(clientId: string, query: string) {
  await connectToDatabase();
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return [];
  const regex = new RegExp(escaped, "i");
  const docs = await WorkoutLog.find({
    client: new Types.ObjectId(clientId),
    $or: [{ exerciseNameAr: regex }, { exerciseNameEn: regex }],
  })
    .sort({ date: 1 })
    .lean();
  return serialize(docs);
}

/** All logs for one exercise (ascending — strength-progress chart). */
export async function getExerciseHistory(clientId: string, exerciseId: string) {
  await connectToDatabase();
  const docs = await WorkoutLog.find({
    client: new Types.ObjectId(clientId),
    exercise: new Types.ObjectId(exerciseId),
  })
    .sort({ date: 1 })
    .lean();
  return serialize(docs);
}

/**
 * Personal records per exercise: best estimated 1RM and heaviest set ever.
 */
export async function getPersonalRecords(clientId: string) {
  await connectToDatabase();
  const records = await WorkoutLog.aggregate([
    { $match: { client: new Types.ObjectId(clientId) } },
    { $unwind: "$sets" },
    {
      $group: {
        _id: "$exercise",
        nameAr: { $first: "$exerciseNameAr" },
        nameEn: { $first: "$exerciseNameEn" },
        maxWeight: { $max: "$sets.weight" },
        bestOneRm: { $max: "$estimatedOneRm" },
        lastDate: { $max: "$date" },
      },
    },
    { $sort: { bestOneRm: -1 } },
  ]);
  return serialize(records);
}

/** Recent logs for a client (coach review / client history). */
export async function getRecentLogs(clientId: string, limit = 20) {
  await connectToDatabase();
  const docs = await WorkoutLog.find({ client: new Types.ObjectId(clientId) })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return serialize(docs);
}
