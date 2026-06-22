import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Edge middleware uses ONLY the edge-safe config (no DB / Node APIs).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Run on everything except Next internals, auth API, and static files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
