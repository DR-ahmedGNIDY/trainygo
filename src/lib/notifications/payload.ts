import type { INotification } from "@/models/Notification";
import type { NotificationPayload } from "./channels/types";

/**
 * Build a fully-resolved, single-locale payload from a persisted notification.
 *
 * This is where the Dispatcher makes ALL content decisions — locale, title,
 * body, link, target, data — so that adapters receive finished content and stay
 * provider- and content-dumb (see channels/types.ts).
 */
export function buildPayload(notification: INotification, locale = "ar"): NotificationPayload {
  const ar = locale === "ar";
  const data: Record<string, string> = {
    notificationId: String(notification._id),
    type: notification.type,
  };
  if (notification.link) data.link = notification.link;

  return {
    title: ar ? notification.titleAr : notification.titleEn,
    body: (ar ? notification.bodyAr : notification.bodyEn) || undefined,
    link: notification.link,
    target: notification.target,
    data,
  };
}
