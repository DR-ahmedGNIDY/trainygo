"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Package, Wallet, Users, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import { resetPlansAction } from "@/lib/actions/admin";
import type { ResetPlansStats } from "@/lib/services/reset-plans";
import type { ResetPlansResult } from "@/lib/services/reset-plans";

export function PlansResetView({ stats }: { stats: ResetPlansStats }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResetPlansResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runReset() {
    setError(null);
    startTransition(async () => {
      const res = await resetPlansAction();
      if (!res.ok) {
        setError(L("تعذر تنفيذ العملية", "Could not complete the operation"));
        setOpen(false);
        return;
      }
      setResult(res.data!);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={L("إعادة إنشاء الباقات", "Reset Plans")}
        description={L(
          "إعادة إنشاء الباقات الافتراضية من لوحة التحكم دون الحاجة لأوامر الطرفية.",
          "Recreate the default plans from the dashboard without terminal commands.",
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{L("إعادة إنشاء الباقات الافتراضية", "Reset default plans")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {L(
              "سيتم حذف جميع الباقات الحالية وسيتم تصفير الإيرادات وسيتم إنشاء الباقات الافتراضية الجديدة.",
              "All current plans will be deleted, revenue will be reset to zero, and the new default plans will be created.",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {L("هذا الإجراء لا يمكن التراجع عنه.", "This action cannot be undone.")}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <Package className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatNumber(stats.plansCount, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("عدد الباقات الحالية", "Current plans")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Wallet className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatNumber(stats.totalRevenue, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("إجمالي الإيرادات الحالية", "Current total revenue")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatNumber(stats.coachesLinked, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("عدد المدربين المرتبطين بالباقات", "Coaches linked to plans")}</div>
            </div>
          </div>

          {result && (
            <div className="flex flex-col gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {L("تم إعادة إنشاء الباقات بنجاح", "Plans were reset successfully")}
              </div>
              <div className="text-xs text-muted-foreground">
                {L("محذوفة", "Deleted")}: {formatNumber(result.plansDeleted, locale)} ·{" "}
                {L("منشأة", "Created")}: {formatNumber(result.plansCreated, locale)} ·{" "}
                {L("اشتراكات مصفّرة", "Subscriptions zeroed")}: {formatNumber(result.subscriptionsZeroed, locale)} ·{" "}
                {L("مدربون معاد ربطهم", "Coaches remapped")}: {formatNumber(result.coachesRemapped, locale)}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button variant="destructive" className="w-full gap-2" onClick={() => setOpen(true)} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {L("إعادة إنشاء الباقات", "Reset plans")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L("تأكيد إعادة إنشاء الباقات", "Confirm plans reset")}</DialogTitle>
            <DialogDescription>
              {L(
                "سيتم حذف جميع الباقات الحالية وتصفير الإيرادات وإنشاء الباقات الجديدة. لا يمكن التراجع عن هذا الإجراء.",
                "All current plans will be deleted, revenue will be reset, and the new plans will be created. This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {L("إلغاء", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={runReset} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {L("تنفيذ", "Execute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
