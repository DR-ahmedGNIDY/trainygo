import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { WorkoutLog } from "@/models/WorkoutLog";
import { WorkoutReport } from "@/models/WorkoutReport";
import { User } from "@/models/User";
import { Exercise } from "@/models/Exercise";
import { bestSetOf, type LoggedSetInput } from "@/lib/services/workout-logs";

interface ExerciseTrend {
  nameAr: string;
  nameEn: string;
  firstWeight: number;
  lastWeight: number;
  firstOneRm: number;
  lastOneRm: number;
}

function buildExerciseTrends(logs: { exercise?: Types.ObjectId | null; exerciseNameAr: string; exerciseNameEn: string; sets: LoggedSetInput[]; estimatedOneRm: number }[]) {
  const byExercise = new Map<string, ExerciseTrend>();
  for (const log of logs) {
    const key = log.exercise ? String(log.exercise) : `${log.exerciseNameAr}|${log.exerciseNameEn}`;
    const top = bestSetOf(log.sets) ?? { weight: 0, reps: 0 };
    const entry = byExercise.get(key);
    if (!entry) {
      byExercise.set(key, {
        nameAr: log.exerciseNameAr,
        nameEn: log.exerciseNameEn,
        firstWeight: top.weight,
        lastWeight: top.weight,
        firstOneRm: log.estimatedOneRm,
        lastOneRm: log.estimatedOneRm,
      });
    } else {
      entry.lastWeight = top.weight;
      entry.lastOneRm = log.estimatedOneRm;
    }
  }
  return byExercise;
}

export interface ClientPerformanceAnalysis {
  periodDays: number;
  strengthChangePercent: number | null;
  topGain: { nameAr: string; nameEn: string; deltaKg: number } | null;
  topLoss: { nameAr: string; nameEn: string; deltaKg: number } | null;
  prCount: number;
  avgSessionDurationSeconds: number | null;
}

/** Last-N-days performance summary for a client, shown to the coach (strength trend, biggest mover, PR count, avg session length). */
export async function getClientPerformanceAnalysis(clientId: string, days = 30): Promise<ClientPerformanceAnalysis> {
  await connectToDatabase();
  const since = new Date(Date.now() - days * 86400000);
  const clientObjId = new Types.ObjectId(clientId);

  const [logs, prCount, reports] = await Promise.all([
    WorkoutLog.find({ client: clientObjId, date: { $gte: since } }).sort({ date: 1 }).lean(),
    WorkoutLog.countDocuments({ client: clientObjId, date: { $gte: since }, isPr: true }),
    WorkoutReport.find({ client: clientObjId, createdAt: { $gte: since } }).select("durationSeconds").lean(),
  ]);

  const trends = buildExerciseTrends(logs);

  let pctSum = 0;
  let pctCount = 0;
  let topGain: { nameAr: string; nameEn: string; deltaKg: number } | null = null;
  let topLoss: { nameAr: string; nameEn: string; deltaKg: number } | null = null;

  for (const e of trends.values()) {
    const deltaKg = Math.round((e.lastWeight - e.firstWeight) * 10) / 10;
    if (e.firstOneRm > 0) {
      pctSum += ((e.lastOneRm - e.firstOneRm) / e.firstOneRm) * 100;
      pctCount += 1;
    }
    if (deltaKg > 0 && (!topGain || deltaKg > topGain.deltaKg)) topGain = { nameAr: e.nameAr, nameEn: e.nameEn, deltaKg };
    if (deltaKg < 0 && (!topLoss || deltaKg < topLoss.deltaKg)) topLoss = { nameAr: e.nameAr, nameEn: e.nameEn, deltaKg };
  }

  const avgSessionDurationSeconds = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.durationSeconds, 0) / reports.length) : null;

  return {
    periodDays: days,
    strengthChangePercent: pctCount > 0 ? Math.round((pctSum / pctCount) * 10) / 10 : null,
    topGain,
    topLoss,
    prCount,
    avgSessionDurationSeconds,
  };
}

export interface TopImprovingClient {
  clientId: string;
  name: string;
  prCount: number;
  improvementScore: number;
}

/** Ranks a coach's clients by PRs then net improvement events over the last N days — for the dashboard widget. */
export async function getTopImprovingClients(coachId: string, days = 7, limit = 5): Promise<TopImprovingClient[]> {
  await connectToDatabase();
  const since = new Date(Date.now() - days * 86400000);
  const rows = await WorkoutLog.aggregate([
    { $match: { coach: new Types.ObjectId(coachId), date: { $gte: since } } },
    {
      $group: {
        _id: "$client",
        prCount: { $sum: { $cond: ["$isPr", 1, 0] } },
        improved: { $sum: { $cond: [{ $eq: ["$comparisonStatus", "improved"] }, 1, 0] } },
        declined: { $sum: { $cond: [{ $eq: ["$comparisonStatus", "decline"] }, 1, 0] } },
      },
    },
    { $addFields: { improvementScore: { $subtract: ["$improved", "$declined"] } } },
    { $sort: { prCount: -1, improvementScore: -1 } },
    { $limit: limit },
  ]);
  if (rows.length === 0) return [];

  const clients = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select("name").lean();
  const nameMap = new Map(clients.map((c) => [String(c._id), c.name]));

  return rows
    .map((r) => ({
      clientId: String(r._id),
      name: nameMap.get(String(r._id)) ?? "—",
      prCount: r.prCount,
      improvementScore: r.improvementScore,
    }))
    .filter((r) => r.prCount > 0 || r.improvementScore > 0);
}

export interface ClientPerformanceStats {
  totalPRs: number;
  bestExercise: { nameAr: string; nameEn: string; bestOneRm: number } | null;
  mostImprovedMuscle: string | null;
  avgAdherencePercent: number | null;
  avgSessionDurationSeconds: number | null;
  totalVolumeKg: number;
}

/** All-time performance stats shown on the client's own profile (PRs, best lift, adherence, volume...). */
export async function getClientPerformanceStats(clientId: string): Promise<ClientPerformanceStats> {
  await connectToDatabase();
  const clientObjId = new Types.ObjectId(clientId);

  const [totalPRs, bestExerciseAgg, volumeAgg, reports, logsWithExercise] = await Promise.all([
    WorkoutLog.countDocuments({ client: clientObjId, isPr: true }),
    WorkoutLog.aggregate([
      { $match: { client: clientObjId } },
      { $group: { _id: "$exercise", nameAr: { $first: "$exerciseNameAr" }, nameEn: { $first: "$exerciseNameEn" }, bestOneRm: { $max: "$estimatedOneRm" } } },
      { $sort: { bestOneRm: -1 } },
      { $limit: 1 },
    ]),
    WorkoutLog.aggregate([
      { $match: { client: clientObjId } },
      { $unwind: "$sets" },
      { $group: { _id: null, volume: { $sum: { $multiply: ["$sets.weight", "$sets.reps"] } } } },
    ]),
    WorkoutReport.find({ client: clientObjId }).select("durationSeconds completedCount skippedCount").lean(),
    WorkoutLog.find({ client: clientObjId, exercise: { $ne: null } }).sort({ date: 1 }).select("exercise exerciseNameAr exerciseNameEn sets estimatedOneRm").lean(),
  ]);

  const avgSessionDurationSeconds = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.durationSeconds, 0) / reports.length) : null;
  const adherenceValues = reports
    .map((r) => (r.completedCount + r.skippedCount > 0 ? (r.completedCount / (r.completedCount + r.skippedCount)) * 100 : null))
    .filter((v): v is number => v != null);
  const avgAdherencePercent = adherenceValues.length > 0 ? Math.round(adherenceValues.reduce((s, v) => s + v, 0) / adherenceValues.length) : null;

  // Most-improved muscle group: sum each exercise's all-time 1RM improvement, weighted into its target muscles.
  let mostImprovedMuscle: string | null = null;
  if (logsWithExercise.length > 0) {
    const trends = buildExerciseTrends(logsWithExercise as never);
    const exerciseIds = [...new Set(logsWithExercise.map((l) => String(l.exercise)))].filter((id) => Types.ObjectId.isValid(id));
    const exerciseDocs = await Exercise.find({ _id: { $in: exerciseIds } }).select("targetMuscles").lean();
    const muscleMap = new Map(exerciseDocs.map((e) => [String(e._id), e.targetMuscles ?? []]));
    const idsInOrder = [...new Set(logsWithExercise.map((l) => String(l.exercise)))];
    const muscleImprovement = new Map<string, number>();
    for (const id of idsInOrder) {
      const trend = trends.get(id);
      if (!trend) continue;
      const improvement = trend.lastOneRm - trend.firstOneRm;
      if (improvement <= 0) continue;
      for (const muscle of muscleMap.get(id) ?? []) {
        muscleImprovement.set(muscle, (muscleImprovement.get(muscle) ?? 0) + improvement);
      }
    }
    let best: [string, number] | null = null;
    for (const entry of muscleImprovement) {
      if (!best || entry[1] > best[1]) best = entry;
    }
    mostImprovedMuscle = best?.[0] ?? null;
  }

  const bestExercise = bestExerciseAgg[0]
    ? { nameAr: bestExerciseAgg[0].nameAr, nameEn: bestExerciseAgg[0].nameEn, bestOneRm: bestExerciseAgg[0].bestOneRm }
    : null;

  return {
    totalPRs,
    bestExercise,
    mostImprovedMuscle,
    avgAdherencePercent,
    avgSessionDurationSeconds,
    totalVolumeKg: Math.round(volumeAgg[0]?.volume ?? 0),
  };
}
