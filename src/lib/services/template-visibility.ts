import { Types, type FilterQuery } from "mongoose";

/**
 * Shared query fragments for the workout/nutrition template services, so both
 * enforce coach isolation identically and only in one place.
 *
 * Authorship is read straight off `isSystemTemplate`, which is present and
 * correct on every document ever written — so none of this needs a migration.
 */

/** Templates every coach may see but only a super admin may edit. */
export function globalTemplateFilter(): FilterQuery<unknown> {
  return { isSystemTemplate: true };
}

/**
 * One coach's own private templates. The `isSystemTemplate` guard is redundant
 * with `createdByCoach` (a global one has no owning coach) but kept as
 * defence-in-depth: ownership is the rule that must never leak.
 */
export function ownTemplateFilter(coachId: string): FilterQuery<unknown> {
  return {
    createdByCoach: new Types.ObjectId(coachId),
    isSystemTemplate: { $ne: true },
  };
}

/**
 * Featured first, then official, then newest — the order every coach's list
 * uses. Mongo sorts a missing `featured` (documents written before the field
 * existed) below `true`, which is exactly the intended placement.
 */
export const TEMPLATE_SORT = {
  featured: -1,
  isSystemTemplate: -1,
  createdAt: -1,
} as const;

/**
 * The ownership fields for a template `scope` is creating (whether from scratch
 * or by duplicating). Only a super admin can author an official one — a coach
 * scope always yields a coach-owned template, which is what makes "duplicate an
 * official template" produce something the coach may then edit.
 *
 * Every new template starts at version 1 and unfeatured: a duplicate is an
 * independent template, not a continuation of its source, and featuring is the
 * super admin's decision alone.
 */
export function templateOwnershipFor(
  scope: { role: "super_admin" } | { role: "coach"; coachId: string },
) {
  return {
    version: 1,
    featured: false,
    isSystemTemplate: scope.role === "super_admin",
    createdByCoach:
      scope.role === "super_admin" ? null : new Types.ObjectId(scope.coachId),
  };
}
