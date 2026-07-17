import { Types, type FilterQuery } from "mongoose";
import { GLOBAL_TEMPLATE_CREATOR_TYPES } from "@/lib/constants";

/**
 * Shared query fragments for the workout/nutrition template services, so both
 * enforce coach isolation identically and only in one place.
 *
 * Every fragment tolerates documents written before `createdByType` existed by
 * also accepting the legacy `isSystemTemplate` boolean. See
 * `@/models/template-creator` for why both fields are kept.
 */

/** Templates every coach may see but only a super admin may edit. */
export function globalTemplateFilter(): FilterQuery<unknown> {
  return {
    $or: [
      { createdByType: { $in: GLOBAL_TEMPLATE_CREATOR_TYPES } },
      // Legacy globals: written before createdByType, so the field is absent.
      { createdByType: { $exists: false }, isSystemTemplate: true },
    ],
  };
}

/**
 * One coach's own private templates. Ownership is still the `createdByCoach`
 * check it always was — the creator type only ever narrows it further, so a
 * global template can never leak in here.
 */
export function ownTemplateFilter(coachId: string): FilterQuery<unknown> {
  return {
    createdByCoach: new Types.ObjectId(coachId),
    createdByType: { $nin: GLOBAL_TEMPLATE_CREATOR_TYPES },
    isSystemTemplate: { $ne: true },
  };
}

/**
 * Globals pinned first, then the coach's own, newest first within each group.
 * Sorts on the legacy boolean because it is present and correct on every
 * document, including legacy ones where createdByType is absent.
 */
export const TEMPLATE_SORT = { isSystemTemplate: -1, createdAt: -1 } as const;
