"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  UserPlus,
  MessageSquare,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  Apple,
  FileText,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/providers/i18n-provider";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
  new_client: UserPlus,
  new_checkin: ClipboardCheck,
  new_message: MessageSquare,
  subscription_expiry: CreditCard,
  subscription_activated: CreditCard,
  new_program: Dumbbell,
  new_nutrition_plan: Apple,
  workout_report: FileText,
  personal_record: Trophy,
  performance_decline: AlertTriangle,
};

export function NotificationsMenu({
  items,
  unread: initialUnread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const { t, locale } = useI18n();
  const [unread, setUnread] = useState(initialUnread);
  const [list, setList] = useState(items);
  const [, startTransition] = useTransition();

  function markAll() {
    setUnread(0);
    setList((l) => l.map((i) => ({ ...i, read: true })));
    startTransition(() => {
      markAllNotificationsReadAction();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t.dashboard.ui.notifications}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute end-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{t.dashboard.ui.notifications}</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">
              {t.dashboard.ui.markAllRead}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t.dashboard.ui.noNotifications}</p>
          ) : (
            list.map((item) => {
              const Icon = ICONS[item.type] ?? Bell;
              const body = (
                <div className={cn("flex gap-3 border-b px-4 py-3 last:border-0", !item.read && "bg-primary/5")}>
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{locale === "ar" ? item.titleAr : item.titleEn}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: locale === "ar" ? ar : enUS })}
                    </p>
                  </div>
                </div>
              );
              return item.link ? (
                <Link key={item.id} href={item.link}>{body}</Link>
              ) : (
                <div key={item.id}>{body}</div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
