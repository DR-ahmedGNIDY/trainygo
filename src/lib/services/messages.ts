import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Conversation, Message } from "@/models/Message";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";

export interface Attachment {
  url: string;
  publicId?: string;
  type: "image" | "file";
  name?: string;
}

/** Ensure a conversation exists for a (coach, client) pair; returns its id. */
export async function getOrCreateConversation(coachId: string, clientId: string) {
  await connectToDatabase();
  // Verify the client belongs to the coach.
  const owns = await User.exists({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
  if (!owns) throw new PermissionError("Not your client", "NOT_FOUND");

  const coach = new Types.ObjectId(coachId);
  const client = new Types.ObjectId(clientId);
  let convo = await Conversation.findOne({ coach, client });
  if (!convo) convo = await Conversation.create({ coach, client });
  return convo;
}

/** The client's single conversation with their coach (created on demand). */
export async function getClientConversation(clientId: string) {
  await connectToDatabase();
  const client = await User.findOne({ _id: clientId, role: "client" })
    .select("clientProfile.coach")
    .lean();
  const coachId = (client?.clientProfile as { coach?: Types.ObjectId } | undefined)?.coach;
  if (!coachId) return null;
  return getOrCreateConversation(String(coachId), clientId);
}

export async function listCoachConversations(coachId: string) {
  await connectToDatabase();
  const docs = await Conversation.find({ coach: new Types.ObjectId(coachId) })
    .populate("client", "name clientProfile.clientCode")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();
  return serialize(docs);
}

async function assertParticipant(conversationId: string, userId: string, role: "coach" | "client") {
  const convo = await Conversation.findById(conversationId).lean();
  if (!convo) throw new PermissionError("Conversation not found", "NOT_FOUND");
  const field = role === "coach" ? convo.coach : convo.client;
  if (String(field) !== userId) throw new PermissionError("Forbidden", "FORBIDDEN");
  return convo;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  role: "coach" | "client",
) {
  await connectToDatabase();
  await assertParticipant(conversationId, userId, role);
  const docs = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .lean();
  return serialize(docs);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  role: "coach" | "client",
  payload: { text?: string; attachments?: Attachment[] },
) {
  await connectToDatabase();
  const convo = await assertParticipant(conversationId, senderId, role);
  const text = payload.text?.trim();
  const attachments = payload.attachments ?? [];
  if (!text && attachments.length === 0) return null;

  const msg = await Message.create({
    conversation: new Types.ObjectId(conversationId),
    sender: new Types.ObjectId(senderId),
    senderRole: role,
    text,
    attachments,
  });

  const inc = role === "coach" ? { unreadForClient: 1 } : { unreadForCoach: 1 };
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: { lastMessage: text || (attachments.length ? "📎" : ""), lastMessageAt: new Date() },
      $inc: inc,
    },
  );

  // Notify the recipient.
  const recipient = role === "coach" ? convo.client : convo.coach;
  const { createNotification } = await import("./notifications");
  await createNotification({
    recipient: String(recipient),
    type: "new_message",
    titleAr: "رسالة جديدة",
    titleEn: "New message",
    link: role === "coach" ? "/client/messages" : "/coach/messages",
  });

  return msg._id.toString();
}

export async function markRead(conversationId: string, userId: string, role: "coach" | "client") {
  await connectToDatabase();
  await assertParticipant(conversationId, userId, role);
  const field = role === "coach" ? { unreadForCoach: 0 } : { unreadForClient: 0 };
  await Conversation.updateOne({ _id: conversationId }, { $set: field });
  await Message.updateMany(
    { conversation: conversationId, senderRole: { $ne: role }, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return true;
}

export async function countUnreadMessages(userId: string, role: "coach" | "client") {
  await connectToDatabase();
  const field = role === "coach" ? "unreadForCoach" : "unreadForClient";
  const key = role === "coach" ? "coach" : "client";
  const rows = await Conversation.aggregate([
    { $match: { [key]: new Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return rows[0]?.total ?? 0;
}
