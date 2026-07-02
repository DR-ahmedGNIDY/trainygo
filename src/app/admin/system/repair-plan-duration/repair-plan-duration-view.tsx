"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Package, AlertCircle, History, CheckCircle, Wrench, CheckCircle2, XCircle } from "lucide-react";
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
import { repairPlanDurationAction } from "@/lib/actions/admin";
import type { RepairPlanDurationStats, RepairPlanDurationResult } from "@/lib/services/repair-plan-duration";

export function RepairPlanDurationView({ stats }: { stats: RepairPlanDurationStats }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RepairPlanDurationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const affected = stats.plansMissingDurationMonths;

  function runRepair() {
    setError(null);
    startTransition(async () => {
      const res = await repairPlanDurationAction();
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
        title={L("إصلاح مدد الباقات", "Repair Plan Duration")}
        description={L(
          "إصلاح الباقات القديمة التي تفتقد مدة الاشتراك بالشهور، دون الحاجة لأوامر الطرفية.",
          "Repair legacy plans missing a monthly subscription duration, without terminal commands.",
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{L("إصلاح مدد الباقات القديمة", "Repair legacy plan durations")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {L(
              "بعض الباقات القديمة لا تحتوي على مدة اشتراك صحيحة (durationMonths)، مما يمنع تفعيل الاشتراكات. سيتم فحص كل باقة وإصلاحها تلقائياً.",
              "Some legacy plans are missing a valid subscription duration (durationMonths), which blocks subscription activation. Every plan will be scanned and repaired automatically.",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {L("هذا الإجراء لا يمكن التراجع عنه.", "This action cannot be undone.")}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4 text-center">
              <Package className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatNumber(stats.plansTotal, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("إجمالي عدد الباقات", "Total plans")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-5 w-5 text-destructive" />
              <div className="text-2xl font-bold text-destructive">{formatNumber(stats.plansMissingDurationMonths, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("باقات بمدة غير صحيحة", "Plans missing duration")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <History className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatNumber(stats.plansWithLegacyDurationDays, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("باقات بحقل قديم (أيام)", "Plans with legacy durationDays")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <CheckCircle className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
              <div className="text-2xl font-bold">{formatNumber(stats.plansAlreadyValid, locale)}</div>
              <div className="text-xs text-muted-foreground">{L("باقات سليمة بالفعل", "Already valid plans")}</div>
            </div>
          </div>

          {affected > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              {L(
                `يوجد ${affected} باقة تحتاج إلى إصلاح.`,
                `${affected} plan(s) need repair.`,
              )}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {L("تم إصلاح مدد الباقات بنجاح", "Plan durations were repaired successfully")}
              </div>
              <div className="text-xs text-muted-foreground">
                {L("عدد الباقات المفحوصة", "Plans scanned")}: {formatNumber(result.plansScanned, locale)} ·{" "}
                {L("عدد الباقات المعدلة", "Plans fixed")}: {formatNumber(result.plansFixed, locale)} ·{" "}
                {L("عدد الباقات السليمة", "Plans skipped (already valid)")}: {formatNumber(result.plansSkipped, locale)}
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            {L("إصلاح مدد الباقات", "Repair plan durations")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L("تأكيد إصلاح مدد الباقات", "Confirm plan duration repair")}</DialogTitle>
            <DialogDescription>
              {L(
                "سيتم فحص جميع الباقات وإصلاح مدة الاشتراك (durationMonths) للباقات التي تفتقدها. لا يمكن التراجع عن هذا الإجراء.",
                "All plans will be scanned and durationMonths repaired for any plan missing it. This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {L("إلغاء", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={runRepair} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {L("تنفيذ", "Execute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
