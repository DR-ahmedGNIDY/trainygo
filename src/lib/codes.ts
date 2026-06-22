import { Counter } from "@/models/Counter";
import { connectToDatabase } from "@/lib/db";

/**
 * Atomically increment a named sequence and return the new value.
 * Safe under concurrency — relies on MongoDB's atomic findOneAndUpdate.
 */
export async function nextSequence(name: string): Promise<number> {
  await connectToDatabase();
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc!.seq;
}

/**
 * Generate the next globally-sequential client code: TRG00001, TRG00002, ...
 * Zero-padded to 5 digits; grows beyond 5 digits automatically past 99,999.
 */
export async function nextClientCode(): Promise<string> {
  const n = await nextSequence("clientCode");
  return `TRG${String(n).padStart(5, "0")}`;
}
