"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Send, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MessageSquare } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { sendMessageAction } from "@/lib/actions/messages";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { FrozenBanner } from "@/components/client/access-banners";
import { cn } from "@/lib/utils";

export interface ChatThread {
  id: string;
  name: string;
  last: string;
  time: string;
  unread: number;
}
export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text?: string;
  attachments?: { url: string; type: "image" | "file" }[];
  time: string;
}

export function RealChatView({
  role,
  threads,
  activeId,
  peerName,
  messages,
  frozenReason,
}: {
  role: "coach" | "client";
  threads?: ChatThread[];
  activeId?: string | null;
  peerName: string;
  messages: ChatMessage[];
  /** When set, the client cannot send messages (their or their coach's subscription lapsed). */
  frozenReason?: "coach" | "self" | null;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function send(extra?: { attachments?: { url: string; publicId?: string; type: "image" | "file" }[] }) {
    if (!activeId) return;
    const text = draft.trim();
    if (!text && !extra?.attachments?.length) return;
    setDraft("");
    startTransition(async () => {
      await sendMessageAction(activeId, { text: text || undefined, attachments: extra?.attachments });
      router.refresh();
    });
  }

  const hasThreads = role === "coach";
  if (role === "coach" && (!threads || threads.length === 0)) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={L("لا توجد محادثات بعد", "No conversations yet")}
        description={L("ابدأ محادثة من ملف العميل.", "Start a conversation from a client's profile.")}
      />
    );
  }

  return (
    <Card className="grid h-[calc(100vh-9.5rem)] overflow-hidden md:grid-cols-[300px_1fr]">
      {hasThreads && (
        <div className="hidden flex-col border-e md:flex">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
              <Input placeholder={t.dashboard.ui.search} className="ps-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {threads!.map((th) => (
              <Link
                key={th.id}
                href={`/coach/messages?c=${th.id}`}
                className={cn(
                  "flex w-full items-center gap-3 border-b px-3 py-3 text-start transition-colors hover:bg-accent",
                  activeId === th.id && "bg-accent",
                )}
              >
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-xs text-primary">{th.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{th.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{th.time}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{th.last || L("ابدأ المحادثة", "Start the conversation")}</p>
                </div>
                {th.unread > 0 && <Badge className="h-5 min-w-5 justify-center px-1.5 text-[11px]">{th.unread}</Badge>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-3 border-b p-3">
          <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-xs text-primary">{peerName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
          <p className="text-sm font-semibold">{peerName}</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-muted/20 p-4">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{L("لا توجد رسائل بعد", "No messages yet")}</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", m.fromMe ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-es-sm border bg-card")}>
                  {m.attachments?.map((a, i) => a.type === "image" ? (
                    <Image key={i} src={a.url} alt="" width={200} height={200} className="mb-1 max-h-48 w-auto rounded-lg" />
                  ) : (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="underline">📎</a>
                  ))}
                  {m.text && <p>{m.text}</p>}
                  <p className={cn("mt-0.5 text-[10px]", m.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {frozenReason ? (
          <div className="border-t p-3">
            <FrozenBanner reason={frozenReason} />
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t p-3">
            <CloudinaryUpload
              kind="messages"
              onUploaded={(url, publicId) => send({ attachments: [{ url, publicId, type: "image" }] })}
              iconOnly
            />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={L("اكتب رسالة...", "Type a message...")}
              disabled={!activeId}
            />
            <Button size="icon" onClick={() => send()} disabled={!activeId || isPending} aria-label="Send">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
