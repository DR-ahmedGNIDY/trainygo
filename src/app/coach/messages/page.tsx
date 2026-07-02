import { requireCoachArea } from "@/lib/auth/session";
import {
  listCoachConversations,
  getMessages,
  markRead,
} from "@/lib/services/messages";
import { RealChatView, type ChatThread, type ChatMessage } from "@/components/messaging/real-chat-view";

export const dynamic = "force-dynamic";

const hhmm = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default async function CoachMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const ctx = await requireCoachArea();
  const coachId = ctx.coachId;
  const convos = await listCoachConversations(coachId);

  const threads: ChatThread[] = convos.map((c) => ({
    id: String(c._id),
    name: ((c.client as unknown as { name?: string })?.name) ?? "—",
    last: c.lastMessage ?? "",
    time: c.lastMessageAt ? hhmm(c.lastMessageAt) : "",
    unread: c.unreadForCoach ?? 0,
  }));

  const sp = await searchParams;
  const active = sp.c
    ? convos.find((c) => String(c._id) === sp.c)
    : convos[0];
  const activeId = active ? String(active._id) : null;

  let messages: ChatMessage[] = [];
  let peerName = "";
  if (active && activeId) {
    peerName = ((active.client as unknown as { name?: string })?.name) ?? "";
    const msgs = await getMessages(activeId, coachId, "coach");
    await markRead(activeId, coachId, "coach");
    messages = msgs.map((m) => ({
      id: String(m._id),
      fromMe: m.senderRole === "coach",
      text: m.text,
      attachments: m.attachments,
      time: hhmm(m.createdAt),
    }));
  }

  return <RealChatView role="coach" threads={threads} activeId={activeId} peerName={peerName} messages={messages} />;
}
