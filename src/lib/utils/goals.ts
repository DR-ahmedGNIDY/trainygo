import { CLIENT_GOALS, type ClientGoal } from "@/lib/constants";

/**
 * Maps legacy/retired goal values (from templates and programs created
 * before CLIENT_GOALS was last revised) to their closest current equivalent.
 * Any key not in CLIENT_GOALS itself is assumed legacy.
 */
export const LEGACY_GOAL_MAP: Record<string, ClientGoal> = {
  general_fitness: "muscle_building",
  performance: "athletic_conditioning",
  sport_performance: "athletic_conditioning",
  athletic_performance: "athletic_conditioning",
  weight_loss: "fat_loss",
  muscle_gain: "muscle_building",
};

/** Safe fallback when an unrecognized legacy value has no explicit mapping above. */
const DEFAULT_GOAL: ClientGoal = "muscle_building";

const VALID_GOALS = new Set<string>(CLIENT_GOALS);

/**
 * Normalizes a goal value to a current, valid ClientGoal. Already-valid
 * values pass through unchanged; legacy values (e.g. "general_fitness") are
 * mapped to their closest current equivalent; unrecognized values fall back
 * to a safe default instead of failing Mongoose enum validation.
 * undefined/null/"" stay undefined — "no goal set" is a valid state, not a
 * legacy value to repair.
 */
export function normalizeGoal(goal: string | null | undefined): ClientGoal | undefined {
  if (!goal) return undefined;
  if (VALID_GOALS.has(goal)) return goal as ClientGoal;
  return LEGACY_GOAL_MAP[goal] ?? DEFAULT_GOAL;
}

/** True if a goal value is anything other than undefined/empty/a current valid ClientGoal — i.e. needs migration. */
export function isLegacyGoal(goal: string | null | undefined): boolean {
  return !!goal && !VALID_GOALS.has(goal);
}
