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
  /** Subscription start/end dates, for rendering a progress bar (null if not set). */
  subscriptionStartDate: Date | null;
  subscriptionEndDate: Date | null;
}

/** Resolves whether a client is frozen (by their own or their coach's subscription) and their own countdown. */
export async function getClientAccessState(clientId: string): Promise<ClientAccessState> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(clientId)) {
    return { frozen: false, frozenReason: null, daysRemaining: null, subscriptionStartDate: null, subscriptionEndDate: null };
  }
  const client = await User.findOne({ _id: clientId, role: "client" })
    .select("clientProfile.coach clientProfile.subscriptionStartDate clientProfile.subscriptionEndDate")
    .lean();
  if (!client) return { frozen: false, frozenReason: null, daysRemaining: null, subscriptionStartDate: null, subscriptionEndDate: null };

  const startDate = client.clientProfile?.subscriptionStartDate ?? null;
  const endDate = client.clientProfile?.subscriptionEndDate ?? null;

  const coachId = client.clientProfile?.coach ? String(client.clientProfile.coach) : null;
  const coachStatus = coachId ? await syncCoachStatus(coachId) : "active";
  if (coachIsFrozen(coachStatus)) {
    return { frozen: true, frozenReason: "coach", daysRemaining: null, subscriptionStartDate: startDate, subscriptionEndDate: endDate };
  }

  let daysRemaining: number | null = null;
  if (endDate) {
    daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
  }

  if (endDate && endDate.getTime() < Date.now()) {
    return { frozen: true, frozenReason: "self", daysRemaining, subscriptionStartDate: startDate, subscriptionEndDate: endDate };
  }

  return { frozen: false, frozenReason: null, daysRemaining, subscriptionStartDate: startDate, subscriptionEndDate: endDate };
}

export interface CoachSubscriptionSummary {
  daysRemaining: number | null;
  endDate: Date | null;
  planName: string | null;
  maxClients: number;
  clientCount: number;
}

/** Coach's own plan/days-left/client-usage summary, for the coach dashboard. */
export async function getCoachSubscriptionSummary(coachId: string): Promise<CoachSubscriptionSummary> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(coachId)) {
    return { daysRemaining: null, endDate: null, planName: null, maxClients: 0, clientCount: 0 };
  }
  const coach = await User.findOne({ _id: coachId, role: "coach" })
    .select("coachProfile.subscriptionEndDate coachProfile.trialEndDate coachProfile.maxClients coachProfile.subscriptionStatus")
    .populate("coachProfile.currentPlan", "name tier")
    .lean();
  if (!coach) return { daysRemaining: null, endDate: null, planName: null, maxClients: 0, clientCount: 0 };

  const endDate = coach.coachProfile?.subscriptionEndDate ?? coach.coachProfile?.trialEndDate ?? null;
  const daysRemaining = endDate ? Math.ceil((endDate.getTime() - Date.now()) / 86_400_000) : null;
  const plan = coach.coachProfile?.currentPlan as unknown as { name?: { ar?: string; en?: string } } | null;
  const clientCount = await User.countDocuments({ role: "client", "clientProfile.coach": new Types.ObjectId(coachId) });

  return {
    daysRemaining,
    endDate,
    planName: plan?.name?.ar ?? plan?.name?.en ?? (coach.coachProfile?.subscriptionStatus === "trial" ? "Trial" : null),
    maxClients: coach.coachProfile?.maxClients ?? 0,
    clientCount,
  };
}
