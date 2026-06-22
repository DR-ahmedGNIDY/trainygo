"use client";

import { useState, useTransition } from "react";
import { Bell, Check, UserPlus, CreditCard, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  read: boolean;
  createdAt: string;
}

const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
  new_client: UserPlus,
  subscription_activated: CreditCard,
  subscription_expiry: AlertTriangle,
};

export function NotificationsView({ initial }: { initial: Item[] }) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const unread = items.filter((i) => !i.read).length;

  function markAll() {
    setItems((p) => p.map((i) => ({ ...i, read: true })));
    startTransition(() => { markAllNotificationsReadAction(); });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.dashboard.adminNav.notifications} description={`${unread} ${locale === "ar" ? "غير مقروء" : "unread"}`}>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="h-4 w-4" />{t.dashboard.ui.markAllRead}
          </Button>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title={t.dashboard.ui.noNotifications} />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((item) => {
              const Icon = ICONS[item.type] ?? Bell;
              return (
                <div key={item.id} className={cn("flex gap-3 p-4", !item.read && "bg-primary/5")}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{locale === "ar" ? item.titleAr : item.titleEn}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: locale === "ar" ? ar : enUS })}
                    </p>
                  </div>
                  {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
