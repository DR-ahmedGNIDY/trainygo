"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

/** Formats the remaining time as "Xd Yh" / "Xh Ym" / "Xm", matching the most significant two units. */
export function formatRemaining(ms: number, locale: "ar" | "en"): string {
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return L(`${days} يوم و ${hours} ساعة`, `${days}d ${hours}h`);
  if (hours > 0) return L(`${hours} ساعة و ${minutes} دقيقة`, `${hours}h ${minutes}m`);
  return L(`${minutes} دقيقة`, `${minutes}m`);
}

/**
 * Live, ticking "time left on subscription" display. Recomputes from the real
 * end-date every second (no more frozen "3 days left" forever), and polls the
 * server every 30s so an expiry that happens mid-session is reflected without
 * a logout/refresh.
 */
export function SubscriptionCountdown({
  endDate,
  expired,
  onPoll,
  renewHref,
}: {
  endDate: string | null;
  /** True if the account is already expired/frozen regardless of endDate (e.g. suspended). */
  expired?: boolean;
  /** Polls the server for the latest status; return true if now expired. */
  onPoll?: () => Promise<{ expired: boolean; endDate: string | null } | null>;
  renewHref?: string;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [end, setEnd] = useState(endDate);
  const [isExpired, setIsExpired] = useState(!!expired);
  const [now, setNow] = useState(() => Date.now());
  const lastStatusRef = useRef(isExpired);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!onPoll) return;
    const id = setInterval(async () => {
      const res = await onPoll();
      if (!res) return;
      setEnd(res.endDate);
      setIsExpired(res.expired);
      if (res.expired && !lastStatusRef.current) {
        lastStatusRef.current = true;
        router.refresh();
      }
      lastStatusRef.current = res.expired;
    }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPoll]);

  const remainingMs = end ? new Date(end).getTime() - now : 0;
  const reallyExpired = isExpired || (end != null && remainingMs <= 0);

  if (reallyExpired) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="flex-1 font-medium text-destructive">{L("انتهى الاشتراك", "Subscription ended")}</span>
        {renewHref && (
          <Button asChild size="sm" variant="destructive">
            <a href={renewHref}>{L("تجديد الاشتراك", "Renew subscription")}</a>
          </Button>
        )}
      </div>
    );
  }

  if (!end) return null;
  const urgent = remainingMs < 24 * 3600_000;

  return (
    <p className={"font-semibold " + (urgent ? "text-destructive" : "")}>
      {formatRemaining(remainingMs, locale)}
    </p>
  );
}
