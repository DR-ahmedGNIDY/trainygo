import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword } from "./password";
import { accountCanLogin } from "@/lib/permissions";
import { loginSchema } from "@/lib/validations/auth";
import { syncCoachStatus } from "@/lib/services/subscription";

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
        };
      },
    }),
  ],
});
