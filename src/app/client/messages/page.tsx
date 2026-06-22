import { requireRole } from "@/lib/auth/session";
import { getClientConversation, getMessages, markRead } from "@/lib/services/messages";
import { User } from "@/models/User";
import { RealChatView, type ChatMessage } from "@/components/messaging/real-chat-view";

export const dynamic = "force-dynamic";

const hhmm = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default async function ClientMessagesPage() {
  const session = await requireRole("client");
  const clientId = session.user.id;
  const convo = await getClientConversation(clientId);

  if (!convo) {
    return <RealChatView role="client" activeId={null} peerName="" messages={[]} />;
  }

  const coach = await User.findById(convo.coach).select("name").lean();
  const peerName = coach?.name ?? "Coach";

  const msgs = await getMessages(String(convo._id), clientId, "client");
  await markRead(String(convo._id), clientId, "client");
  const messages: ChatMessage[] = msgs.map((m) => ({
    id: String(m._id),
    fromMe: m.senderRole === "client",
    text: m.text,
    attachments: m.attachments,
    time: hhmm(m.createdAt),
  }));

  return <RealChatView role="client" activeId={String(convo._id)} peerName={peerName} messages={messages} />;
}
