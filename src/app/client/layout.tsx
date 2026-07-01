import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { listNotifications, countUnread } from "@/lib/services/notifications";
import { getEffectiveBrandForClient, FITXNET_DEFAULT_BRAND } from "@/lib/services/brand-settings";
import { hasBrandingAccessForClient } from "@/lib/services/feature-access";
import { BrandProvider } from "@/components/providers/brand-provider";
import type { NotificationItem } from "@/components/dashboard/notifications-menu";

export async function generateMetadata(): Promise<Metadata> {
  const session = await requireRole("client");
  const hasAccess = await hasBrandingAccessForClient(session.user.id);
  if (!hasAccess) return {};
  const brand = await getEffectiveBrandForClient(session.user.id);
  return { icons: { icon: brand.favicon ?? "/icon.png" } };
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("client");

  const [raw, unread, hasAccess] = await Promise.all([
    listNotifications(session.user.id, 20),
    countUnread(session.user.id),
    hasBrandingAccessForClient(session.user.id),
  ]);
  const brand = hasAccess
    ? await getEffectiveBrandForClient(session.user.id)
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
        role="client"
        name={session.user.name ?? session.user.username}
        status={session.user.status}
        notifications={notifications}
        unread={unread}
      >
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
