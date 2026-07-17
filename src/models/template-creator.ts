import type { Schema } from "mongoose";
import type { TemplateCreatorType } from "@/lib/constants";

/**
 * `createdByType` is the newer, extensible discriminator; `isSystemTemplate` is
 * the original boolean that live documents and older queries still rely on.
 * Both describe the same fact, so they must never disagree.
 *
 * Rather than migrating production data, we keep both fields and reconcile them
 * at the two points where they could drift:
 *
 *  - WRITE: a pre-save hook derives whichever field wasn't set explicitly.
 *  - READ: `resolveCreatorType()` fills in `createdByType` for documents written
 *    before the field existed (where it is simply absent).
 */

export interface CreatorFields {
  createdByType?: TemplateCreatorType | null;
  isSystemTemplate?: boolean | null;
}

/**
 * The authoring source of a template, tolerant of pre-`createdByType`
 * documents. Read paths must go through this rather than touching
 * `createdByType` directly, or legacy globals would read back as coach-owned.
 */
export function resolveCreatorType(doc: CreatorFields): TemplateCreatorType {
  if (doc.createdByType) return doc.createdByType;
  return doc.isSystemTemplate ? "super_admin" : "coach";
}

/** True for templates every coach can see but only a super admin may edit. */
export function isGlobalTemplate(doc: CreatorFields): boolean {
  return resolveCreatorType(doc) !== "coach";
}

/**
 * Registers the pre-save hook that keeps the two fields consistent on writes,
 * in whichever direction the caller happened to set.
 */
export function syncCreatorType(schema: Schema): void {
  schema.pre("save", function syncTemplateCreatorFields(next) {
    const doc = this as unknown as CreatorFields & {
      isModified(path: string): boolean;
    };

    // `createdByType` is authoritative; fall back to the legacy boolean only
    // when a caller set that one instead (or when neither was set).
    if (!doc.createdByType || (doc.isModified("isSystemTemplate") && !doc.isModified("createdByType"))) {
      doc.createdByType = doc.isSystemTemplate ? "super_admin" : "coach";
    }
    doc.isSystemTemplate = doc.createdByType === "super_admin";

    next();
  });
}
