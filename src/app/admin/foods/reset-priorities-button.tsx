"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { resetAllFoodPrioritiesAction } from "@/lib/actions/admin-maintenance";

/**
 * TEMPORARY super-admin button: resets every food's priority to ★ and clears
 * all overrides. Remove together with admin-maintenance.ts once run.
 */
export function ResetPrioritiesButton() {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    if (
      !window.confirm(
        L(
          "تعيين كل الأصناف إلى ★ نجمة واحدة ومسح كل التخصيصات؟",
          "Set all foods to ★ (1 star) and clear all overrides?",
        ),
      )
    )
      return;
    start(async () => {
      const res = await resetAllFoodPrioritiesAction();
      if (res.ok && res.data) {
        setMsg(
          L(
            `تم ✅ — ${res.data.foods} صنف · ${res.data.overrides} تخصيص`,
            `Done ✅ — ${res.data.foods} foods · ${res.data.overrides} overrides`,
          ),
        );
        router.refresh();
      } else if (!res.ok) {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={run}
        disabled={pending}
        className="border-amber-500/60 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 text-amber-500" />}
        {L("تصفير كل الأولويات إلى ★", "Reset all priorities to ★")}
      </Button>
      {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}
