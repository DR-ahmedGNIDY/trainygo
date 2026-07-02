import type { Metadata } from "next";
import { requireCoachArea } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { listNotifications, countUnread } from "@/lib/services/notifications";
import { getEffectiveBrand, FITXNET_DEFAULT_BRAND } from "@/lib/services/brand-settings";
import { hasBrandingAccess } from "@/lib/services/feature-access";
import { BrandProvider } from "@/components/providers/brand-provider";
import { canAccessBranding } from "@/lib/permissions/team";
import type { NotificationItem } from "@/components/dashboard/notifications-menu";

export async function generateMetadata(): Promise<Metadata> {
  // Branding (favicon/colors/logo) is always inherited from the owner coach
  // — team members work inside the coach's academy, regardless of whether
  // they personally have permission to *edit* branding settings.
  const ctx = await requireCoachArea();
  const hasAccess = await hasBrandingAccess(ctx.coachId);
  if (!hasAccess) return {};
  const brand = await getEffectiveBrand(ctx.coachId);
  return { icons: { icon: brand.favicon ?? "/icon.png" } };
}

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireCoachArea();
  const session = await auth();
  const isTeamMember = ctx.role === "team_member";

  const [raw, unread, hasAccess] = await Promise.all([
    // Team members don't see the owner coach's personal notification feed
    // (that's Phase 3 scope — a dedicated per-member notification stream).
    isTeamMember ? Promise.resolve([]) : listNotifications(ctx.actingUserId, 20),
    isTeamMember ? Promise.resolve(0) : countUnread(ctx.actingUserId),
    hasBrandingAccess(ctx.coachId),
  ]);
  // Only load and apply custom brand when the owner coach actually has
  // branding access. Branding settings are preserved on the document even
  // without access (never deleted). Applies to team members too — they
  // inherit the owner's academy identity (name/colors/logo) unconditionally.
  const brand = hasAccess
    ? await getEffectiveBrand(ctx.coachId)
    : { ...FITXNET_DEFAULT_BRAND };
  const notifications: NotificationItem[] = raw.map((n) => ({
    id: String(n._id),
    type: n.type,
    titleAr: n.titleAr,
    titleEn: n.titleEn,
    link: n.link,
    read: n.read,
    createdAt: String(n.createdAt),
  }));
  return (
    <BrandProvider initialBrand={brand}>
      <DashboardShell
        role={ctx.role === "team_member" ? "team_member" : "coach"}
        name={session?.user?.name ?? session?.user?.username ?? ""}
        status={ctx.status}
        notifications={notifications}
        unread={unread}
        featureFlags={{
          branding: hasAccess && canAccessBranding(ctx),
          teamCtx: isTeamMember ? { role: ctx.role, permissions: ctx.permissions } : undefined,
        }}
      >
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
