import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Exercise } from "@/models/Exercise";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import type { ExerciseData } from "@/lib/validations/exercise";

export type ExerciseScope =
  | { role: "super_admin" }
  | { role: "coach"; coachId: string };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ListOpts {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
}

/** Visibility: coach sees system + their own custom; admin sees system only. */
function visibilityFilter(scope: ExerciseScope) {
  if (scope.role === "coach") {
    return {
      $or: [
        { isSystemExercise: true },
        { createdByCoach: new Types.ObjectId(scope.coachId) },
      ],
    };
  }
  return { isSystemExercise: true };
}

export async function listExercises(scope: ExerciseScope, opts: ListOpts = {}) {
  await connectToDatabase();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(60, Math.max(1, opts.limit ?? 24));

  const and: Record<string, unknown>[] = [visibilityFilter(scope)];
  if (opts.category && opts.category !== "all") and.push({ category: opts.category });
  if (opts.query?.trim()) {
    const rx = new RegExp(escapeRegex(opts.query.trim()), "i");
    and.push({ $or: [{ nameAr: rx }, { nameEn: rx }] });
  }
  const filter = { $and: and };

  const [items, total] = await Promise.all([
    Exercise.find(filter)
      .sort({ isSystemExercise: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Exercise.countDocuments(filter),
  ]);

  return {
    items: serialize(items),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

/** Media-only lookup for a batch of exercise ids (program/template entries
 * only store a reference + denormalized name, not media URLs). */
export async function getExerciseMediaByIds(ids: string[]) {
  await connectToDatabase();
  const valid = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return {} as Record<string, {
    videoUrl?: string; youtubeUrl?: string; imageUrlStart?: string; imageUrlEnd?: string; gifUrl?: string;
  }>;
  const docs = await Exercise.find({ _id: { $in: valid } })
    .select("videoUrl youtubeUrl imageUrlStart imageUrlEnd gifUrl")
    .lean();
  const map: Record<string, { videoUrl?: string; youtubeUrl?: string; imageUrlStart?: string; imageUrlEnd?: string; gifUrl?: string }> = {};
  for (const d of docs) {
    map[String(d._id)] = {
      videoUrl: d.videoUrl,
      youtubeUrl: d.youtubeUrl,
      imageUrlStart: d.imageUrlStart,
      imageUrlEnd: d.imageUrlEnd,
      gifUrl: d.gifUrl,
    };
  }
  return map;
}

export async function getExercise(id: string, scope: ExerciseScope) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await Exercise.findOne({ _id: id, ...visibilityFilter(scope) }).lean();
  return doc ? serialize(doc) : null;
}

export async function createExercise(scope: ExerciseScope, data: ExerciseData) {
  await connectToDatabase();
  const isSystem = scope.role === "super_admin";
  const doc = await Exercise.create({
    nameAr: data.nameAr,
    nameEn: data.nameEn,
    category: data.category,
    targetMuscles: data.targetMuscles,
    description: data.description,
    instructions: data.instructions,
    commonMistakes: data.commonMistakes,
    coachTips: data.coachTips,
    gifUrl: data.gifUrl || undefined,
    gifPublicId: data.gifPublicId || undefined,
    youtubeUrl: data.youtubeUrl || undefined,
    imageUrlStart: data.imageUrlStart || undefined,
    imageUrlEnd: data.imageUrlEnd || undefined,
    videoUrl: data.videoUrl || undefined,
    videoPublicId: data.videoPublicId || undefined,
    isSystemExercise: isSystem,
    createdByCoach: isSystem ? null : new Types.ObjectId((scope as { coachId: string }).coachId),
  });
  return doc._id.toString();
}

function assertCanMutate(
  ex: { isSystemExercise: boolean; createdByCoach?: Types.ObjectId | null },
  scope: ExerciseScope,
) {
  if (scope.role === "super_admin") {
    if (!ex.isSystemExercise)
      throw new PermissionError("Cannot edit coach exercise", "FORBIDDEN");
  } else {
    if (ex.isSystemExercise || String(ex.createdByCoach) !== scope.coachId)
      throw new PermissionError("Cannot edit system exercise", "FORBIDDEN");
  }
}

export async function updateExercise(id: string, scope: ExerciseScope, data: ExerciseData) {
  await connectToDatabase();
  const ex = await Exercise.findById(id);
  if (!ex) return false;
  assertCanMutate(ex, scope);
  ex.nameAr = data.nameAr;
  ex.nameEn = data.nameEn;
  ex.category = data.category;
  ex.targetMuscles = data.targetMuscles;
  ex.description = data.description;
  ex.instructions = data.instructions;
  ex.commonMistakes = data.commonMistakes;
  ex.coachTips = data.coachTips;
  ex.gifUrl = data.gifUrl || undefined;
  ex.gifPublicId = data.gifPublicId || undefined;
  ex.youtubeUrl = data.youtubeUrl || undefined;
  ex.imageUrlStart = data.imageUrlStart || undefined;
  ex.imageUrlEnd = data.imageUrlEnd || undefined;
  ex.videoUrl = data.videoUrl || undefined;
  ex.videoPublicId = data.videoPublicId || undefined;
  await ex.save();
  return true;
}

export async function deleteExercise(id: string, scope: ExerciseScope) {
  await connectToDatabase();
  const ex = await Exercise.findById(id);
  if (!ex) return false;
  assertCanMutate(ex, scope);
  await ex.deleteOne();
  return true;
}
