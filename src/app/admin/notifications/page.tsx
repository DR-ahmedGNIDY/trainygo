import { requireRole } from "@/lib/auth/session";
import { listNotifications } from "@/lib/services/notifications";
import { NotificationsView } from "./notifications-view";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await requireRole("super_admin");
  const raw = await listNotifications(session.user.id, 50);
  const initial = raw.map((n) => ({
    id: String(n._id),
    type: n.type,
    titleAr: n.titleAr,
    titleEn: n.titleEn,
    read: n.read,
    createdAt: String(n.createdAt),
  }));
  return <NotificationsView initial={initial} />;
}
