"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createExerciseChangeRequestAction } from "@/lib/actions/client-requests";
import {
  EXERCISE_CHANGE_QUICK_REASONS,
  type ExerciseChangeQuickReason,
} from "@/lib/constants";
import { EXERCISE_CHANGE_QUICK_REASON_LABELS } from "@/lib/i18n/labels";

const MAX_REASON = 500;

export function ExerciseChangeRequestDialog({
  open,
  onOpenChange,
  programId,
  weekNumber,
  dayNumber,
  exerciseId,
  exerciseNameAr,
  exerciseNameEn,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  programId: string;
  weekNumber: number;
  dayNumber: number;
  exerciseId?: string | null;
  exerciseNameAr: string;
  exerciseNameEn: string;
  /** Called after a successful submit so the caller can mark this exercise pending. */
  onSubmitted: () => void;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [quickReason, setQuickReason] = useState<ExerciseChangeQuickReason | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset the form each time the dialog is (re)opened for an exercise.
  useEffect(() => {
    if (open) {
      setQuickReason(null);
      setReason("");
      setSubmitting(false);
    }
  }, [open, exerciseId, exerciseNameEn]);

  function selectReason(value: ExerciseChangeQuickReason) {
    setQuickReason(value);
    // "Other" → jump straight to the details field so the client can explain.
    if (value === "other") {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }

  const canSubmit = (Boolean(quickReason) || reason.trim().length > 0) && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await createExerciseChangeRequestAction({
      programId,
      weekNumber,
      dayNumber,
      exerciseId: exerciseId ?? null,
      exerciseNameAr,
      exerciseNameEn,
      quickReason: quickReason ?? undefined,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success(L("تم إرسال طلب تغيير التمرين إلى المدرب.", "Your exercise change request was sent to your coach."));
      onSubmitted();
      onOpenChange(false);
    } else if (res.code === "DUPLICATE_PENDING") {
      toast.error(L("لديك طلب قيد المراجعة لهذا التمرين.", "You already have a pending request for this exercise."));
      onSubmitted();
      onOpenChange(false);
    } else {
      toast.error(res.error || L("تعذر إرسال الطلب.", "Couldn't send the request."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{L("طلب تغيير التمرين", "Request exercise change")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium">
            {locale === "ar" ? exerciseNameAr : exerciseNameEn}
          </div>

          {/* Section 1 — quick reasons */}
          <div>
            <p className="mb-2 text-sm font-semibold">{L("أسباب سريعة", "Quick reasons")}</p>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_CHANGE_QUICK_REASONS.map((key) => {
                const selected = quickReason === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectReason(key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent",
                    )}
                  >
                    {L(EXERCISE_CHANGE_QUICK_REASON_LABELS[key].ar, EXERCISE_CHANGE_QUICK_REASON_LABELS[key].en)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 — details */}
          <div>
            <p className="mb-2 text-sm font-semibold">{L("التفاصيل", "Details")}</p>
            <textarea
              ref={textareaRef}
              value={reason}
              maxLength={MAX_REASON}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={L(
                "اشرح للمدرب سبب رغبتك في تغيير هذا التمرين...",
                "Explain to your coach why you'd like to change this exercise...",
              )}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1 text-end text-xs text-muted-foreground" dir="ltr">
              {reason.length}/{MAX_REASON}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {L("إلغاء", "Cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {L("إرسال الطلب", "Send request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
