"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export interface ActionErrorInfo {
  error?: string;
  code?: string;
}

/**
 * Renders a server action's failure reason instead of a generic fallback.
 * Gives the expired/suspended coach (COACH_READ_ONLY) a clear explanation
 * and a way to act on it, since that's by far the most common write failure
 * across assign/copy/duplicate dialogs.
 */
export function ActionErrorAlert({ result }: { result: ActionErrorInfo | null }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  if (!result) return null;

  if (result.code === "COACH_READ_ONLY") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-destructive">
            {L(
              "انتهت الفترة التجريبية أو الاشتراك. الحساب يعمل حالياً بوضع القراءة فقط. قم بتجديد الاشتراك للمتابعة.",
              "Your trial or subscription has ended. Your account is currently in read-only mode. Renew your subscription to continue.",
            )}
          </p>
        </div>
        <Button asChild size="sm" variant="destructive" className="self-start">
          <Link href="/coach/subscription">{L("تجديد الاشتراك", "Renew subscription")}</Link>
        </Button>
      </div>
    );
  }

  return <p className="text-sm text-destructive">{result.error || t.common.errorDescription}</p>;
}
