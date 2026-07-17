/**
 * Shared domain rules for workout/nutrition templates, so the services, pages
 * and views all answer "who owns this and what may they do with it" the same
 * way.
 *
 * `isSystemTemplate` is the single stored source of truth for authorship: true
 * means a super admin authored it, which is exactly what makes it both GLOBAL
 * (visible to every coach) and OFFICIAL (badged as coming from FITXNET). Those
 * are two names for one fact, so `official` is DERIVED here rather than stored
 * as a second boolean that could drift out of sync with the first — and no
 * migration is needed for it.
 */

/** The authorship fields every template carries. */
export interface TemplateOwnership {
  isSystemTemplate?: boolean | null;
  createdByCoach?: unknown;
}

/** True for templates every coach can see but only a super admin may edit. */
export function isGlobalTemplate(tpl: TemplateOwnership): boolean {
  return !!tpl.isSystemTemplate;
}

/**
 * True for templates authored by FITXNET itself. Identical to
 * `isGlobalTemplate` by construction — kept as its own name because the two
 * describe different things to the reader: one is a visibility rule, the other
 * is what the coach sees on the badge.
 */
export function isOfficialTemplate(tpl: TemplateOwnership): boolean {
  return !!tpl.isSystemTemplate;
}

/**
 * Whether `scope` may edit/delete this template. A coach may only mutate their
 * own; official templates are read-only to them (duplicate to edit). The super
 * admin owns the official ones and may not touch a coach's private template.
 */
export function canMutateTemplate(
  tpl: TemplateOwnership,
  scope: { role: "super_admin" } | { role: "coach"; coachId: string },
): boolean {
  if (scope.role === "super_admin") return isGlobalTemplate(tpl);
  return !isGlobalTemplate(tpl) && String(tpl.createdByCoach) === scope.coachId;
}
