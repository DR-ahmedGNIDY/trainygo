import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ForceChangePasswordScreen } from "@/components/client/force-change-password";
import { listNotifications, countUnread } from "@/lib/services/notifications";
import type { NotificationItem } from "@/components/dashboard/notifications-menu";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("client");

  if (session.user.mustChangePassword) {
    return <ForceChangePasswordScreen />;
  }

  const [raw, unread] = await Promise.all([
    listNotifications(session.user.id, 20),
    countUnread(session.user.id),
  ]);
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
    <DashboardShell
      role="client"
      name={session.user.name ?? session.user.username}
      status={session.user.status}
      notifications={notifications}
      unread={unread}
    >
      {children}
    </DashboardShell>
  );
}
