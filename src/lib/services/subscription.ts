import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { computeEffectiveCoachStatus, coachIsFrozen } from "@/lib/permissions";
import type { AccountStatus } from "@/lib/constants";

/**
 * Recomputes a coach's effective status from their trial/subscription end
 * dates and persists it if it has drifted (e.g. trial lapsed since last
 * check). Called on login and at the top of coach-context resolution so
 * expiry is enforced without a separate cron job.
 */
export async function syncCoachStatus(coachId: string): Promise<AccountStatus> {
  await connectToDatabase();
  const coach = await User.findOne({ _id: coachId, role: "coach" })
    .select("status coachProfile.trialEndDate coachProfile.subscriptionEndDate")
    .lean();
  if (!coach) return "active";

  const effective = computeEffectiveCoachStatus(
    coach.status,
    coach.coachProfile?.trialEndDate ?? null,
    coach.coachProfile?.subscriptionEndDate ?? null,
  );
  if (effective !== coach.status) {
    await User.updateOne(
      { _id: coachId },
      { $set: { status: effective, "coachProfile.subscriptionStatus": effective } },
    );
  }
  return effective;
}

export interface ClientAccessState {
  /** True if the client cannot start workouts/check-ins/reports/messages. */
  frozen: boolean;
  /** "coach" = their coach's subscription lapsed; "self" = their own subscription ended. */
  frozenReason: "coach" | "self" | null;
  /** Days left on the client's own subscription (null if no end date set). */
  daysRemaining: number | null;
}

/** Resolves whether a client is frozen (by their own or their coach's subscription) and their own countdown. */
export async function getClientAccessState(clientId: string): Promise<ClientAccessState> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) {
    return { frozen: false, frozenReason: null, daysRemaining: null };
  }
  const client = await User.findOne({ _id: clientId, role: "client" })
    .select("clientProfile.coach clientProfile.subscriptionEndDate")
    .lean();
  if (!client) return { frozen: false, frozenReason: null, daysRemaining: null };

  const coachId = client.clientProfile?.coach ? String(client.clientProfile.coach) : null;
  const coachStatus = coachId ? await syncCoachStatus(coachId) : "active";
  if (coachIsFrozen(coachStatus)) {
    return { frozen: true, frozenReason: "coach", daysRemaining: null };
  }

  const endDate = client.clientProfile?.subscriptionEndDate ?? null;
  let daysRemaining: number | null = null;
  if (endDate) {
    daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
  }

  if (endDate && endDate.getTime() < Date.now()) {
    return { frozen: true, frozenReason: "self", daysRemaining };
  }

  return { frozen: false, frozenReason: null, daysRemaining };
}
