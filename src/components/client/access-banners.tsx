"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

/** Shown when the client (or their coach) is frozen — blocks the relevant action. */
export function FrozenBanner({ reason }: { reason: "coach" | "self" }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const message =
    reason === "coach"
      ? L(
          "حسابك قيد التجميد حالياً نتيجة تجميد حساب المدرب الخاص بك.",
          "Your account is currently frozen due to your coach's account being frozen.",
        )
      : L(
          "انتهى اشتراكك. يرجى التواصل مع مدربك لتجديده والاستمرار.",
          "Your subscription has ended. Please contact your coach to renew.",
        );

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-foreground/90">{message}</p>
    </div>
  );
}

/** Shown on the client dashboard as their own subscription nears expiry. */
export function SubscriptionCountdownBanner({ daysRemaining }: { daysRemaining: number }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  if (daysRemaining > 10) return null;
  const urgent = daysRemaining <= 3;

  return (
    <div
      className={
        "mb-4 flex items-center gap-3 rounded-lg border p-3 text-sm " +
        (urgent
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-warning/40 bg-warning/10 text-foreground/90")
      }
    >
      <AlertTriangle className={"h-4 w-4 shrink-0 " + (urgent ? "text-destructive" : "text-warning")} />
      <span>
        {daysRemaining <= 0
          ? L("انتهى اشتراكك اليوم.", "Your subscription ends today.")
          : L(
              `باقي ${daysRemaining} ${daysRemaining === 1 ? "يوم" : "أيام"} على انتهاء اشتراكك.`,
              `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on your subscription.`,
            )}
      </span>
    </div>
  );
}

/** Always-visible subscription days-left + progress bar, shown at the top of the client dashboard. */
export function SubscriptionProgressCard({
  startDate,
  endDate,
  daysRemaining,
}: {
  startDate: Date | string | null;
  endDate: Date | string | null;
  daysRemaining: number | null;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  if (!endDate) return null;
  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : null;
  const totalDays = start ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000)) : null;
  const remaining = daysRemaining ?? Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const progress = totalDays ? Math.min(100, Math.max(0, 100 - (Math.max(0, remaining) / totalDays) * 100)) : null;
  const urgent = remaining <= 3;

  return (
    <div className="mb-4 rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{L("اشتراكك", "Your subscription")}</span>
        <span className={urgent ? "font-semibold text-destructive" : "text-muted-foreground"}>
          {remaining <= 0
            ? L("منتهي", "Expired")
            : L(`باقي ${remaining} ${remaining === 1 ? "يوم" : "أيام"}`, `${remaining} day${remaining === 1 ? "" : "s"} left`)}
        </span>
      </div>
      {progress != null && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={"h-full rounded-full " + (urgent ? "bg-destructive" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground" dir="ltr">
        {L("ينتهي في", "Ends on")} {end.toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}
