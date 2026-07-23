import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Landing } from "@/components/marketing/landing";

export default async function HomePage() {
  // Signed-in users get their dashboard, not the marketing page — otherwise the
  // home route looks "logged out" even with a valid session. Reading the session
  // makes this route dynamic (no static cache), which is what we want here.
  const session = await auth();
  if (session?.user) redirect(homePathForRole(session.user.role));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Landing />
      </div>
      <SiteFooter />
    </div>
  );
}
