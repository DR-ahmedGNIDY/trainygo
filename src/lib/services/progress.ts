import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ProgressEntry } from "@/models/ProgressEntry";
import { serialize } from "@/lib/serialize";

export interface MeasurementInput {
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  arms?: number;
  thighs?: number;
  notes?: string;
  photos?: {
    front?: { url: string; publicId?: string };
    side?: { url: string; publicId?: string };
    back?: { url: string; publicId?: string };
  };
  date?: Date;
}

/** Full measurement history for a client (ascending — for charts). */
export async function getProgressHistory(clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return [];
  const docs = await ProgressEntry.find({ client: clientId })
    .sort({ date: 1 })
    .lean();
  return serialize(docs);
}

/** Most recent measurement for a client. */
export async function getLatestMeasurement(clientId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) return null;
  const doc = await ProgressEntry.findOne({ client: clientId })
    .sort({ date: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}

/** Add a measurement entry (client logs own; coach must own the client). */
export async function addMeasurement(
  clientId: string,
  coachId: string,
  input: MeasurementInput,
) {
  await connectToDatabase();
  const doc = await ProgressEntry.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    date: input.date ?? new Date(),
    weight: input.weight,
    bodyFat: input.bodyFat,
    chest: input.chest,
    waist: input.waist,
    arms: input.arms,
    thighs: input.thighs,
    notes: input.notes,
    photos: input.photos ?? {},
  });
  return doc._id.toString();
}

/** Latest measurement per client for a coach (measurements overview). */
export async function getCoachLatestMeasurements(coachId: string) {
  await connectToDatabase();
  const rows = await ProgressEntry.aggregate([
    { $match: { coach: new Types.ObjectId(coachId) } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: "$client",
        weight: { $first: "$weight" },
        bodyFat: { $first: "$bodyFat" },
        date: { $first: "$date" },
        first: { $last: "$weight" },
      },
    },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "client" } },
    { $addFields: { clientName: { $first: "$client.name" } } },
    { $project: { client: 0 } },
    { $sort: { date: -1 } },
  ]);
  return serialize(rows);
}

/** Recent measurement entries that include photos, for a coach's clients. */
export async function getCoachPhotoEntries(coachId: string, limit = 20) {
  await connectToDatabase();
  const rows = await ProgressEntry.find({
    coach: new Types.ObjectId(coachId),
    $or: [
      { "photos.front.url": { $exists: true } },
      { "photos.side.url": { $exists: true } },
      { "photos.back.url": { $exists: true } },
    ],
  })
    .populate("client", "name")
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return serialize(rows);
}

/** Build a {label,value} weight series for charts from history. */
export function toWeightSeries(
  history: { date: string | Date; weight?: number }[],
): { label: string; value: number }[] {
  return history
    .filter((h) => typeof h.weight === "number")
    .map((h) => ({
      label: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      value: h.weight as number,
    }));
}
