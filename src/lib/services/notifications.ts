import { connectToDatabase } from "@/lib/db";
import { Notification, type INotificationTarget } from "@/models/Notification";
import type { NotificationType } from "@/lib/constants";
import { serialize } from "@/lib/serialize";
import { dispatchNotification } from "@/lib/notifications/dispatcher";

export interface CreateNotificationInput {
  recipient: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  link?: string;
  /** Optional structured target (used by cross-platform channels). */
  target?: INotificationTarget;
  /**
   * Optional idempotency key: when set, retrying the same operation resolves to
   * the same notification instead of creating a duplicate.
   */
  idempotencyKey?: string;
}

/**
 * Emit a notification. This is a thin, back-compatible wrapper over the unified
 * dispatcher: it persists the record (source of truth) and fans out to every
 * registered channel. The signature is unchanged, so existing callers work as
 * before; new callers may pass `target` / `idempotencyKey`, or migrate to
 * versioned templates via `dispatchNotification` directly.
 */
export async function createNotification(input: CreateNotificationInput) {
  await dispatchNotification({
    recipient: input.recipient,
    type: input.type,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr,
    bodyEn: input.bodyEn,
    link: input.link,
    target: input.target,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function listNotifications(userId: string, limit = 30) {
  await connectToDatabase();
  const items = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return serialize(items);
}

export async function countUnread(userId: string): Promise<number> {
  await connectToDatabase();
  return Notification.countDocuments({ recipient: userId, read: false });
}

export async function markAllRead(userId: string) {
  await connectToDatabase();
  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } },
  );
}
