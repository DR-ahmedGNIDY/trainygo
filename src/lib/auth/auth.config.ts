import type { NextAuthConfig } from "next-auth";
import { homePathForRole } from "@/lib/permissions";
import type { AccountStatus, Locale, UserRole } from "@/lib/constants";

type AppToken = {
  id?: string;
  role?: UserRole;
  username?: string;
  status?: AccountStatus;
  locale?: Locale;
  mustChangePassword?: boolean;
};

const PROTECTED_PREFIXES = ["/admin", "/coach", "/client"];

/**
 * Edge-safe auth config. Contains NO database or Node-only code so it can run
 * inside middleware. The real Credentials provider (which touches MongoDB) is
 * added in `src/lib/auth/index.ts`, which runs in the Node.js runtime.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      const isProtected = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      if (!isProtected) return true;

      // Not signed in → bounce to /login (NextAuth handles the redirect).
      if (!user) return false;

      // Signed in but outside their own role's area → send them home.
      const home = homePathForRole(user.role);
      const withinHome =
        pathname === home || pathname.startsWith(`${home}/`);
      if (!withinHome) {
        return Response.redirect(new URL(home, request.nextUrl));
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.username = user.username;
        token.status = user.status;
        token.locale = user.locale;
        token.mustChangePassword = user.mustChangePassword;
      }
      // Allow client-initiated session.update() to refresh volatile fields.
      if (trigger === "update" && session) {
        if (session.locale) token.locale = session.locale;
        if (session.status) token.status = session.status;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as AppToken;
      if (session.user) {
        if (t.id) session.user.id = t.id;
        if (t.role) session.user.role = t.role;
        if (t.username) session.user.username = t.username;
        if (t.status) session.user.status = t.status;
        if (t.locale) session.user.locale = t.locale;
        session.user.mustChangePassword = t.mustChangePassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
