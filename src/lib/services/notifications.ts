import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import type { NotificationType } from "@/lib/constants";
import { serialize } from "@/lib/serialize";

export interface CreateNotificationInput {
  recipient: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  await connectToDatabase();
  await Notification.create(input);
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
