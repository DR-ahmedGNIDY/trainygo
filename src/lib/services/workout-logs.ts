import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutLog } from "@/models/WorkoutLog";
import { serialize } from "@/lib/serialize";

export interface LoggedSetInput {
  setNumber: number;
  weight: number;
  reps: number;
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

/** Record a client's exercise log. coachId derives from the client's coach. */
export async function logExercise(
  clientId: string,
  coachId: string,
  input: LogExerciseInput,
) {
  await connectToDatabase();
  const doc = await WorkoutLog.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    program: input.programId ? new Types.ObjectId(input.programId) : null,
    exercise: input.exerciseId ? new Types.ObjectId(input.exerciseId) : null,
    exerciseNameAr: input.exerciseNameAr,
    exerciseNameEn: input.exerciseNameEn,
    weekNumber: input.weekNumber,
    dayNumber: input.dayNumber,
    date: input.date ?? new Date(),
    sets: input.sets,
    notes: input.notes,
    completed: input.completed ?? true,
    estimatedOneRm: bestOneRm(input.sets),
  });
  return doc._id.toString();
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
