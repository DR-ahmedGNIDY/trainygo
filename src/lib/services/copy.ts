import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ClientProgram } from "@/models/ClientProgram";
import { NutritionPlan } from "@/models/NutritionPlan";
import {
  assignTemplateToClient,
  duplicateProgram,
} from "./programs";
import {
  assignNutritionTemplateToClient,
  duplicateNutritionPlan,
} from "./nutrition-plans";

export type CopyWhat = "workout" | "nutrition" | "both";

/**
 * Copy one or more workout/nutrition templates to many clients (deep copies).
 * Returns how many programs/plans were created.
 */
export async function copyTemplatesToClients(
  coachId: string,
  source: { workoutTemplateId?: string; nutritionTemplateId?: string },
  clientIds: string[],
) {
  let programs = 0;
  let plans = 0;
  for (const clientId of clientIds) {
    if (source.workoutTemplateId) {
      await assignTemplateToClient(coachId, source.workoutTemplateId, clientId);
      programs++;
    }
    if (source.nutritionTemplateId) {
      await assignNutritionTemplateToClient(coachId, source.nutritionTemplateId, clientId);
      plans++;
    }
  }
  return { programs, plans };
}

/**
 * Copy a source client's current program and/or nutrition plan to many other
 * clients (deep copies). Picks the client's active item, falling back to the
 * most recent non-archived one — legacy rows saved without a proper `status`
 * would otherwise be invisible to a strict `status: "active"` filter and make
 * the copy silently do nothing. Skips a target silently if the source has
 * nothing. `found` reports whether a source item existed for `what`.
 */
export async function copyClientToClients(
  coachId: string,
  fromClientId: string,
  what: CopyWhat,
  clientIds: string[],
) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  const client = new Types.ObjectId(fromClientId);

  const srcProgram =
    what !== "nutrition"
      ? (await ClientProgram.findOne({ coach, client, status: "active" }).sort({ createdAt: -1 }).select("_id").lean()) ??
        (await ClientProgram.findOne({ coach, client, status: { $ne: "archived" } }).sort({ createdAt: -1 }).select("_id").lean())
      : null;
  const srcPlan =
    what !== "workout"
      ? (await NutritionPlan.findOne({ coach, client, status: "active" }).sort({ createdAt: -1 }).select("_id").lean()) ??
        (await NutritionPlan.findOne({ coach, client, status: { $ne: "archived" } }).sort({ createdAt: -1 }).select("_id").lean())
      : null;

  let programs = 0;
  let plans = 0;
  for (const target of clientIds) {
    if (target === fromClientId) continue;
    if (srcProgram) {
      await duplicateProgram(coachId, String(srcProgram._id), target);
      programs++;
    }
    if (srcPlan) {
      await duplicateNutritionPlan(coachId, String(srcPlan._id), target);
      plans++;
    }
  }
  // Whether the source client actually had something to copy for `what`. Lets
  // the UI tell "nothing to copy" apart from a genuine success with 0 targets.
  const found =
    what === "workout"
      ? Boolean(srcProgram)
      : what === "nutrition"
        ? Boolean(srcPlan)
        : Boolean(srcProgram || srcPlan);
  return { programs, plans, found };
}
