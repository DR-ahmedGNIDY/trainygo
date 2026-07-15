"use server";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import {
  coachRegisterSchema,
  type CoachRegisterInput,
} from "@/lib/validations/auth";
import { TRIAL_DURATION_DAYS, TRIAL_MAX_CLIENTS, TRIAL_MAX_TEAM_MEMBERS } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { logError } from "@/lib/logging/error-log";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request-context";

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "USERNAME_TAKEN" | "EMAIL_TAKEN" | "VALIDATION" | "SERVER" | "RATE_LIMITED"; field?: string };

/**
 * Register a new coach. Starts a 7-day free trial. Username & email must be
 * unique. The temporary record is created with status "trial".
 */
export async function registerCoach(
  input: CoachRegisterInput,
): Promise<RegisterResult> {
  // Rate limit account creation per IP (3 / hour) to curb trial-farming abuse.
  const ip = await getClientIp();
  if (!rateLimit(RATE_LIMITS.register, ip).ok) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const parsed = coachRegisterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const { name, brandName, username, email, phone, password } = parsed.data;
  const uname = username.toLowerCase().trim();
  const mail = email.toLowerCase().trim();

  await connectToDatabase();

  if (await User.exists({ username: uname })) {
    return { ok: false, error: "USERNAME_TAKEN", field: "username" };
  }
  if (await User.exists({ email: mail })) {
    return { ok: false, error: "EMAIL_TAKEN", field: "email" };
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);
  const passwordHash = await hashPassword(password);
  const locale = await getLocale();

  try {
    await User.create({
      name,
      username: uname,
      email: mail,
      phone,
      passwordHash,
      role: "coach",
      status: "trial",
      locale,
      coachProfile: {
        brandName: brandName || undefined,
        trialStartDate: now,
        trialEndDate: trialEnd,
        subscriptionStatus: "trial",
        subscriptionEndDate: trialEnd,
        // Trial accounts are capped (1 client, no team members) so the free
        // trial can't be used as unlimited production capacity.
        maxClients: TRIAL_MAX_CLIENTS,
        maxTeamMembers: TRIAL_MAX_TEAM_MEMBERS,
      },
    });
  } catch (e: unknown) {
    const err = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      return {
        ok: false,
        error: field === "email" ? "EMAIL_TAKEN" : "USERNAME_TAKEN",
        field,
      };
    }
    const error = e instanceof Error ? e : new Error(String(e));
    await logError({
      type: "AUTH_ERROR",
      message: error.message,
      stack: error.stack,
      email: mail,
      route: "/register",
      action: "registerCoach",
    });
    return { ok: false, error: "SERVER" };
  }

  return { ok: true };
}
