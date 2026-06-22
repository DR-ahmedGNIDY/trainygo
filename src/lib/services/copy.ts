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
 * Copy a source client's ACTIVE program and/or nutrition plan to many other
 * clients (deep copies). Skips a target silently if the source has nothing.
 */
export async function copyClientToClients(
  coachId: string,
  fromClientId: string,
  what: CopyWhat,
  clientIds: string[],
) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);

  const srcProgram =
    what !== "nutrition"
      ? await ClientProgram.findOne({ coach, client: new Types.ObjectId(fromClientId), status: "active" }).select("_id").lean()
      : null;
  const srcPlan =
    what !== "workout"
      ? await NutritionPlan.findOne({ coach, client: new Types.ObjectId(fromClientId), status: "active" }).select("_id").lean()
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
  return { programs, plans };
}
