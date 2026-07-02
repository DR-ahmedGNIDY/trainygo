import type { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";

/** Raw shape read straight off the collection — bypasses the typed Mongoose schema so a missing/legacy durationMonths or leftover durationDays field is visible instead of silently stripped. */
interface RawPlanDoc {
  _id: ObjectId;
  name?: { ar?: string; en?: string };
  tier?: string;
  price?: number;
  maxClients?: number;
  durationMonths?: number;
  durationDays?: number;
}

export interface RepairPlanDurationStats {
  plansTotal: number;
  plansMissingDurationMonths: number;
  plansWithLegacyDurationDays: number;
  plansAlreadyValid: number;
}

function isValidDurationMonths(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function readRawPlans(): Promise<RawPlanDoc[]> {
  return Plan.collection
    .find({})
    .project({ _id: 1, name: 1, tier: 1, price: 1, maxClients: 1, durationMonths: 1, durationDays: 1 })
    .toArray() as unknown as Promise<RawPlanDoc[]>;
}

/** Current-state stats shown on the Super Admin "Repair Plan Duration" page before the action runs. */
export async function getRepairPlanDurationStats(): Promise<RepairPlanDurationStats> {
  await connectToDatabase();
  const docs = await readRawPlans();

  let plansMissingDurationMonths = 0;
  let plansWithLegacyDurationDays = 0;
  let plansAlreadyValid = 0;

  for (const doc of docs) {
    if (isValidDurationMonths(doc.durationMonths)) {
      plansAlreadyValid++;
      continue;
    }
    plansMissingDurationMonths++;
    if (typeof doc.durationDays === "number" && doc.durationDays > 0) {
      plansWithLegacyDurationDays++;
    }
  }

  return {
    plansTotal: docs.length,
    plansMissingDurationMonths,
    plansWithLegacyDurationDays,
    plansAlreadyValid,
  };
}

export interface RepairPlanDurationResult {
  plansScanned: number;
  plansFixed: number;
  plansSkipped: number;
}

/**
 * Repairs Plan documents with a missing or invalid durationMonths — the
 * root cause of "Cast to date failed for value \"Invalid Date\"" on
 * subscription activation (addMonths(startDate, undefined) silently
 * produces an Invalid Date when durationMonths is missing).
 *
 * Repair order per plan (first match wins):
 *   1. durationMonths already valid (> 0)  → left untouched (skipped)
 *   2. legacy durationDays field present    → round(durationDays / 30), min 1
 *   3. tier name starts with "quarterly"    → 3
 *   4. otherwise (monthly plan, unrecognized tier) → 1
 *
 * The stale durationDays field is unset once durationMonths is repaired.
 */
export async function repairPlanDuration(): Promise<RepairPlanDurationResult> {
  await connectToDatabase();
  const docs = await readRawPlans();

  let plansFixed = 0;
  let plansSkipped = 0;

  for (const doc of docs) {
    console.log("PLAN", {
      _id: doc._id,
      name: doc.name,
      tier: doc.tier,
      price: doc.price,
      maxClients: doc.maxClients,
      durationMonths: doc.durationMonths,
      durationDays: doc.durationDays,
    });

    if (isValidDurationMonths(doc.durationMonths)) {
      plansSkipped++;
      continue;
    }

    let repaired: number;
    if (typeof doc.durationDays === "number" && doc.durationDays > 0) {
      repaired = Math.max(1, Math.round(doc.durationDays / 30));
    } else if (doc.tier?.startsWith("quarterly")) {
      repaired = 3;
    } else {
      repaired = 1;
    }

    await Plan.collection.updateOne(
      { _id: doc._id },
      { $set: { durationMonths: repaired }, $unset: { durationDays: "" } },
    );
    plansFixed++;
  }

  return {
    plansScanned: docs.length,
    plansFixed,
    plansSkipped,
  };
}
