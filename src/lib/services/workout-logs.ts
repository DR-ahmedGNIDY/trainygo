import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutLog, type ComparisonStatus, type DifficultyRating } from "@/models/WorkoutLog";
import { ClientProgram } from "@/models/ClientProgram";
import { Exercise } from "@/models/Exercise";
import { serialize } from "@/lib/serialize";

/**
 * Returns the programId only if it is a valid ObjectId referencing a program
 * that belongs to this exact (client, coach) tenant — otherwise null. Prevents
 * a client from attaching a foreign/forged program reference to their log.
 */
async function validOwnedProgramId(
  programId: string | undefined,
  clientId: string,
  coachId: string,
): Promise<Types.ObjectId | null> {
  if (!programId || !Types.ObjectId.isValid(programId)) return null;
  const owns = await ClientProgram.exists({
    _id: programId,
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
  });
  return owns ? new Types.ObjectId(programId) : null;
}

/**
 * Returns the exerciseId only if it is a valid ObjectId referencing a system
 * exercise or one owned by this coach — otherwise null. Prevents forged/foreign
 * exercise references leaking into a tenant's history.
 */
async function validExerciseId(
  exerciseId: string | undefined,
  coachId: string,
): Promise<Types.ObjectId | null> {
  if (!exerciseId || !Types.ObjectId.isValid(exerciseId)) return null;
  const ok = await Exercise.exists({
    _id: exerciseId,
    $or: [{ isSystemExercise: true }, { createdByCoach: new Types.ObjectId(coachId) }],
  });
  return ok ? new Types.ObjectId(exerciseId) : null;
}

export interface LoggedSetInput {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface PreviousPerformance {
  date: string;
  sets: LoggedSetInput[];
  estimatedOneRm: number;
  difficultyRating?: DifficultyRating | null;
  /** The heaviest set ever logged for this exercise (by estimated 1RM), which may predate this session. */
  bestSet?: { weight: number; reps: number } | null;
}

/**
 * A plain weight-increase suggestion (never applied automatically) based on how
 * easy the client found the previous session for this exercise.
 */
export function suggestedWeightIncrease(previous: PreviousPerformance | null): number | null {
  if (!previous?.difficultyRating) return null;
  const lastWeight = previous.bestSet?.weight ?? previous.sets[previous.sets.length - 1]?.weight ?? 0;
  const step = lastWeight >= 40 ? 5 : 2.5;
  if (previous.difficultyRating === "very_easy") return step * 2;
  if (previous.difficultyRating === "easy") return step;
  return null;
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
  difficultyRating?: DifficultyRating | null;
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

/** The single heaviest set in a list, by estimated 1RM. */
export function bestSetOf(sets: LoggedSetInput[]): { weight: number; reps: number } | null {
  return sets.reduce<{ weight: number; reps: number } | null>((best, s) => {
    if (!best || epley1RM(s.weight, s.reps) > epley1RM(best.weight, best.reps)) return { weight: s.weight, reps: s.reps };
    return best;
  }, null);
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

/** True if the client's last 3 logs for this exercise (most recent first, including this one) are all declines. */
async function hasDeclineStreak(clientId: string, exerciseId: string): Promise<boolean> {
  const recent = await WorkoutLog.find({
    client: new Types.ObjectId(clientId),
    exercise: new Types.ObjectId(exerciseId),
  })
    .sort({ date: -1 })
    .limit(3)
    .select("comparisonStatus")
    .lean();
  return recent.length === 3 && recent.every((r) => r.comparisonStatus === "decline");
}

/** Record a client's exercise log. coachId derives from the client's coach. */
export async function logExercise(
  clientId: string,
  coachId: string,
  input: LogExerciseInput,
): Promise<{
  id: string;
  comparisonStatus: ComparisonStatus;
  isPr: boolean;
  previous: PreviousPerformance | null;
  declineStreak: boolean;
}> {
  await connectToDatabase();
  const date = input.date ?? new Date();
  const newOneRm = bestOneRm(input.sets);

  // Validate client-supplied refs against this tenant before persisting them,
  // so a forged programId/exerciseId can never enter the log.
  const [ownedProgram, ownedExercise] = await Promise.all([
    validOwnedProgramId(input.programId, clientId, coachId),
    validExerciseId(input.exerciseId, coachId),
  ]);
  const validExerciseIdStr = ownedExercise ? ownedExercise.toString() : undefined;

  let previous: PreviousPerformance | null = null;
  let allTimeBest = 0;
  if (validExerciseIdStr) {
    [previous, allTimeBest] = await Promise.all([
      getPreviousLog(clientId, validExerciseIdStr, date),
      getAllTimeBestOneRm(clientId, validExerciseIdStr, date),
    ]);
  }
  const comparisonStatus = comparePerformance(newOneRm, previous, allTimeBest);
  const isPr = comparisonStatus === "pr";

  const doc = await WorkoutLog.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    program: ownedProgram,
    exercise: ownedExercise,
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
    difficultyRating: input.difficultyRating ?? null,
  });

  const declineStreak =
    comparisonStatus === "decline" && validExerciseIdStr
      ? await hasDeclineStreak(clientId, validExerciseIdStr)
      : false;

  return { id: doc._id.toString(), comparisonStatus, isPr, previous, declineStreak };
}

/** Most recent previous performance for each given exercise (for the "last time" card during a session). */
export async function getLastPerformanceMap(
  clientId: string,
  exerciseIds: string[],
): Promise<Record<string, PreviousPerformance>> {
  await connectToDatabase();
  const ids = [...new Set(exerciseIds)].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return {};
  const [lastDocs, bestSets] = await Promise.all([
    WorkoutLog.aggregate([
      { $match: { client: new Types.ObjectId(clientId), exercise: { $in: ids } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: "$exercise",
          date: { $first: "$date" },
          sets: { $first: "$sets" },
          estimatedOneRm: { $first: "$estimatedOneRm" },
          difficultyRating: { $first: "$difficultyRating" },
        },
      },
    ]),
    WorkoutLog.aggregate([
      { $match: { client: new Types.ObjectId(clientId), exercise: { $in: ids } } },
      { $unwind: "$sets" },
      { $addFields: { setOneRm: { $multiply: ["$sets.weight", { $add: [1, { $divide: ["$sets.reps", 30] }] }] } } },
      { $sort: { setOneRm: -1 } },
      { $group: { _id: "$exercise", weight: { $first: "$sets.weight" }, reps: { $first: "$sets.reps" } } },
    ]),
  ]);
  const bestSetMap = new Map(bestSets.map((b) => [String(b._id), { weight: b.weight, reps: b.reps }]));
  const map: Record<string, PreviousPerformance> = {};
  for (const d of lastDocs) {
    map[String(d._id)] = {
      date: d.date.toISOString(),
      sets: d.sets,
      estimatedOneRm: d.estimatedOneRm,
      difficultyRating: d.difficultyRating ?? null,
      bestSet: bestSetMap.get(String(d._id)) ?? null,
    };
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
