import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword } from "./password";
import { accountCanLogin } from "@/lib/permissions";
import { loginSchema } from "@/lib/validations/auth";
import { syncCoachStatus } from "@/lib/services/subscription";
import { logError } from "@/lib/logging/error-log";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request-context";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;

        // Brute-force guard: 5 attempts / 15 min, keyed by IP + identifier so
        // one attacker can't burn through many accounts, nor one account be
        // hammered from many IPs. Fail closed (reject) when over the limit.
        const ip = await getClientIp();
        const id0 = identifier.toLowerCase().trim();
        const byIp = rateLimit(RATE_LIMITS.login, `ip:${ip}`);
        const byId = rateLimit(RATE_LIMITS.login, `id:${id0}`);
        if (!byIp.ok || !byId.ok) {
          return null;
        }

        try {
          await connectToDatabase();
          const id = identifier.toLowerCase().trim();
          const user = await User.findOne({
            $or: [{ username: id }, { email: id }],
          });
          if (!user) return null;

          const ok = await comparePassword(password, user.passwordHash);
          if (!ok) return null;

          // Suspended accounts cannot sign in. Expired coaches CAN (read-only).
          if (!accountCanLogin(user.status)) return null;

          // Best-effort last-login stamp.
          user.lastLoginAt = new Date();
          await user.save().catch(() => {});

          // Coaches: lapsed trial/subscription dates flip status to "expired" here.
          const effectiveStatus =
            user.role === "coach"
              ? await syncCoachStatus(user._id.toString()).catch(() => user.status)
              : user.status;

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email ?? undefined,
            username: user.username,
            role: user.role,
            status: effectiveStatus,
            locale: user.locale,
            mustChangePassword: user.mustChangePassword,
            sessionVersion: user.sessionVersion ?? 0,
          };
        } catch (error) {
          // Unexpected failure (DB down, etc.) — NOT a normal wrong-password
          // rejection, so this is worth recording. Still return null so the
          // login form just shows "invalid credentials" as before.
          await logError({
            type: "AUTH_ERROR",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            email: identifier,
            route: "/login",
            action: "authorize",
          });
          return null;
        }
      },
    }),
  ],
});
