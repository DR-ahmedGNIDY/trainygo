import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";

/**
 * Returns true if the coach has White Label branding access.
 *
 * Priority order:
 *   1. `featureOverrides.branding === true`  → force-enabled (super admin manual grant)
 *   2. `featureOverrides.branding === false` → force-disabled (super admin manual revoke)
 *   3. `featureOverrides.branding == null`  → defer to plan:
 *        active/trial subscription AND plan.planFeatures.branding === true → enabled
 *        otherwise → disabled
 *
 * Subscription expiry always disables access regardless of override or plan
 * (except manual true override, which remains authoritative even when expired).
 * Branding settings are NEVER deleted — only access is toggled.
 */
export async function hasBrandingAccess(coachId: string): Promise<boolean> {
  await connectToDatabase();
  const coach = await User.findById(coachId)
    .select("coachProfile.featureOverrides coachProfile.subscriptionStatus coachProfile.currentPlan")
    .lean();
  if (!coach?.coachProfile) return false;
  const cp = coach.coachProfile;

  // Subscription expiry always gates access first — no override can bypass a lapsed sub.
  const status = cp.subscriptionStatus;
  if (status !== "active" && status !== "trial") return false;

  const override = cp.featureOverrides?.branding;

  // Admin overrides evaluated after confirming subscription is live
  if (override === true) return true;
  if (override === false) return false;

  // null / absent → defer to plan features
  if (!cp.currentPlan) return false;
  const plan = await Plan.findById(cp.currentPlan).select("planFeatures").lean();
  return plan?.planFeatures?.branding === true;
}

/** Same check resolved from a client's coach. */
export async function hasBrandingAccessForClient(clientId: string): Promise<boolean> {
  await connectToDatabase();
  const client = await User.findById(clientId).select("clientProfile.coach").lean();
  const coachId = client?.clientProfile?.coach?.toString();
  if (!coachId) return false;
  return hasBrandingAccess(coachId);
}

/**
 * Set `featureOverrides.branding` for a coach (super admin manual override).
 * Pass `true` to force-enable, `false` to force-disable, `null` to revert to plan.
 */
export async function setCoachBrandingEnabled(
  coachId: string,
  enabled: boolean | null,
): Promise<void> {
  await connectToDatabase();
  await User.updateOne(
    { _id: coachId, role: "coach" },
    { $set: { "coachProfile.featureOverrides.branding": enabled } },
  );
}
