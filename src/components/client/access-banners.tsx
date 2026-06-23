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
