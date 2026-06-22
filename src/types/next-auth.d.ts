import type { DefaultSession } from "next-auth";
import type { UserRole, AccountStatus, Locale } from "@/lib/constants";

declare module "next-auth" {
  interface User {
    role: UserRole;
    username: string;
    status: AccountStatus;
    locale: Locale;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      username: string;
      status: AccountStatus;
      locale: Locale;
      mustChangePassword?: boolean;
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
  }
}
