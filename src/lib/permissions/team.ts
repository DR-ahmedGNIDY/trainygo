import {
  TEAM_PERMISSION_KEYS,
  TEAM_SPECIALIZATIONS,
  type TeamPermissionKey,
  type TeamSpecialization,
  type UserRole,
} from "@/lib/constants";
import type { ITeamPermissions } from "@/models/User";

/**
 * Centralized permission engine for the team-member role. Pages and actions
 * must NEVER hardcode `role === "..."` checks to decide access to a module —
 * they call the `canAccessX()` / `canManageX()` helpers below, which read the
 * team member's actual permission bag (never their role/specialization
 * label). This is what lets new specializations be added later purely as
 * data (a new preset in TEAM_ROLE_PRESETS) without touching any page.
 */
export interface TeamPermissionContext {
  /** "coach" and "super_admin" always pass every check — the permission bag only constrains "team_member". */
  role: UserRole;
  permissions: ITeamPermissions;
}

/** Every permission granted — used for coach/super_admin contexts where the bag itself is irrelevant. */
export const FULL_TEAM_PERMISSIONS: ITeamPermissions = Object.fromEntries(
  TEAM_PERMISSION_KEYS.map((key) => [key, true]),
) as ITeamPermissions;

/** Every permission denied — the safe default for a freshly-created team member with no preset applied. */
export const NO_TEAM_PERMISSIONS: ITeamPermissions = Object.fromEntries(
  TEAM_PERMISSION_KEYS.map((key) => [key, false]),
) as ITeamPermissions;

/**
 * Default permission bag seeded per specialization when a coach creates a
 * team member. Purely a starting point — the coach can toggle any individual
 * permission afterward, and that edit is authoritative from then on.
 */
export const TEAM_ROLE_PRESETS: Record<TeamSpecialization, Partial<ITeamPermissions>> = {
  nutrition_specialist: {
    canAccessNutrition: true,
    canAccessFoods: true,
    canAccessReports: true,
  },
  fitness_coach: {
    canAccessWorkout: true,
    canAccessExercises: true,
    canAccessReports: true,
  },
  assistant_coach: {
    canAccessNutrition: true,
    canAccessWorkout: true,
    canManageClients: true,
    canAccessReports: true,
  },
  academy_manager: {
    canManageClients: true,
    canManageSubscriptions: true,
    canAccessBilling: true,
    canAccessAnalytics: true,
    canManageTeam: true,
  },
  physiotherapist: {
    canAccessMeasurements: true,
    canAccessRecovery: true,
    canAccessReports: true,
  },
};

/** Builds a full permission bag for a new team member: every key false, then the specialization's preset applied on top. */
export function buildDefaultPermissions(specialization: TeamSpecialization): ITeamPermissions {
  return { ...NO_TEAM_PERMISSIONS, ...TEAM_ROLE_PRESETS[specialization] };
}

function hasPermission(ctx: TeamPermissionContext, key: TeamPermissionKey): boolean {
  if (ctx.role !== "team_member") return true;
  return ctx.permissions[key] === true;
}

export function canAccessNutrition(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessNutrition");
}
export function canAccessWorkout(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessWorkout");
}
export function canAccessReports(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessReports");
}
export function canManageClients(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canManageClients");
}
export function canManageTeam(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canManageTeam");
}
export function canManageSubscriptions(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canManageSubscriptions");
}
export function canAccessBranding(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessBranding");
}
export function canAccessBilling(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessBilling");
}
export function canAccessAnalytics(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessAnalytics");
}
export function canAccessRecovery(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessRecovery");
}
export function canAccessTemplates(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessTemplates");
}
export function canAccessFoods(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessFoods");
}
export function canAccessExercises(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessExercises");
}
export function canAccessMeasurements(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessMeasurements");
}
export function canAccessSystem(ctx: TeamPermissionContext): boolean {
  return hasPermission(ctx, "canAccessSystem");
}
export function canAccessSuperAdmin(ctx: TeamPermissionContext): boolean {
  return ctx.role === "super_admin";
}

/** True if a specialization string is one of the known presets (for validating input in the Team CRUD form/action). */
export function isValidSpecialization(value: string): value is TeamSpecialization {
  return (TEAM_SPECIALIZATIONS as readonly string[]).includes(value);
}
