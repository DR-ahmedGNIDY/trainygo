import type { DefaultSession } from "next-auth";
import type { UserRole, AccountStatus, Locale } from "@/lib/constants";

declare module "next-auth" {
  interface User {
    role: UserRole;
    username: string;
    status: AccountStatus;
    locale: Locale;
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      username: string;
      status: AccountStatus;
      locale: Locale;
      mustChangePassword?: boolean;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    username: string;
    status: AccountStatus;
    locale: Locale;
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }
}
