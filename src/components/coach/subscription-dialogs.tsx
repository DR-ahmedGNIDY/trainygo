"use client";

import { useState } from "react";
import { Loader2, PauseCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { freezeClientAction, renewClientAction } from "@/lib/actions/subscription-freeze";
import { SUBSCRIPTION_MONTHS } from "@/lib/validations/subscription-freeze";

const MONTH_LABELS: Record<number, { ar: string; en: string }> = {
  1: { ar: "شهر", en: "1 month" },
  3: { ar: "٣ أشهر", en: "3 months" },
  6: { ar: "٦ أشهر", en: "6 months" },
  12: { ar: "١٢ شهر", en: "12 months" },
};

/** Freeze a client's subscription (reason + optional notes). Shared by the profile and the clients list. */
export function FreezeDialog({
  open,
  onOpenChange,
  clientId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setReason("");
      setNotes("");
      setError(null);
    }
  }

  async function submit() {
    if (!clientId) return;
    setSaving(true);
    setError(null);
    const res = await freezeClientAction(clientId, { reason, notes });
    setSaving(false);
    if (res.ok) onDone();
    else setError(res.error ?? L("تعذّر تجميد الاشتراك", "Could not freeze the subscription"));
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-destructive" />
            {L("تجميد الاشتراك", "Freeze subscription")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {L(
            "سيتم إيقاف وصول العميل مؤقتاً مع الحفاظ على الأيام المتبقية. يمكنك استئناف الاشتراك في أي وقت.",
            "The client's access is paused temporarily while their remaining days are preserved. You can resume anytime.",
          )}
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{L("السبب", "Reason")}</Label>
            <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={L("مثال: سفر، إصابة، طلب العميل", "e.g. travel, injury, client request")} />
          </div>
          <div className="space-y-2">
            <Label>{L("ملاحظات (اختياري)", "Notes (optional)")}</Label>
            <textarea
              value={notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>{t.common.cancel}</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {L("تجميد", "Freeze")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Renew (extend) a client's subscription by a chosen number of months. Shared by the profile and the clients list. */
export function RenewDialog({
  open,
  onOpenChange,
  clientId,
  expired = false,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
  /** When true the subscription has already ended — copy reflects a fresh renewal from today. */
  expired?: boolean;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<string>("1");

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setMonths("1");
      setError(null);
    }
  }

  async function submit() {
    if (!clientId) return;
    setSaving(true);
    setError(null);
    const res = await renewClientAction(clientId, { months });
    setSaving(false);
    if (res.ok) onDone();
    else setError(res.error ?? L("تعذّر تجديد الاشتراك", "Could not renew the subscription"));
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {L("تجديد الاشتراك", "Renew subscription")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {expired
            ? L(
                "انتهى اشتراك هذا العميل. سيبدأ الاشتراك الجديد من اليوم بالمدة التي تختارها.",
                "This client's subscription has ended. The new term starts today for the duration you choose.",
              )
            : L(
                "ستُضاف المدة المختارة إلى تاريخ انتهاء الاشتراك الحالي دون فقدان أي أيام.",
                "The chosen duration is added to the current end date without losing any days.",
              )}
        </p>
        <div className="space-y-2">
          <Label>{L("مدة التجديد", "Renewal duration")}</Label>
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_MONTHS.map((m) => (
                <SelectItem key={m} value={String(m)}>{L(MONTH_LABELS[m].ar, MONTH_LABELS[m].en)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>{t.common.cancel}</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {L("تجديد", "Renew")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
