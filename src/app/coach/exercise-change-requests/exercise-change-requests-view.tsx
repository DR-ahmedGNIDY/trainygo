"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExerciseMedia } from "@/components/library/exercise-media";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  label,
  EXERCISE_CHANGE_QUICK_REASON_LABELS,
  REQUEST_STATUS_LABELS,
} from "@/lib/i18n/labels";
import {
  searchExercisesAction,
  type ExercisePickerItem,
} from "@/lib/actions/exercises";
import {
  approveExerciseChangeRequestAction,
  rejectExerciseChangeRequestAction,
} from "@/lib/actions/client-requests";
import type { RequestStatus } from "@/lib/constants";
import type { ExerciseChangeAnalytics } from "@/lib/services/client-requests";

export interface RequestRow {
  id: string;
  status: RequestStatus;
  quickReason?: string;
  reason: string;
  coachNote: string;
  createdAt: string;
  resolvedAt: string | null;
  clientName: string;
  programNameAr: string;
  programNameEn: string;
  weekNumber: number;
  dayNumber: number;
  exerciseNameAr: string;
  exerciseNameEn: string;
  replacementNameAr: string;
  replacementNameEn: string;
}

const STATUS_VARIANT: Record<RequestStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

export function ExerciseChangeRequestsView({
  rows,
  analytics,
  canApprove,
}: {
  rows: RequestRow[];
  analytics: ExerciseChangeAnalytics;
  canApprove: boolean;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const [viewRow, setViewRow] = useState<RequestRow | null>(null);
  const [approveRow, setApproveRow] = useState<RequestRow | null>(null);
  const [rejectRow, setRejectRow] = useState<RequestRow | null>(null);

  const statusLabel = (s: RequestStatus) => label(REQUEST_STATUS_LABELS, s, locale);
  const quickReasonLabel = (key?: string) =>
    key ? label(EXERCISE_CHANGE_QUICK_REASON_LABELS, key, locale) : "—";

  return (
    <div>
      <PageHeader
        title={L("طلبات تغيير التمارين", "Exercise change requests")}
        description={L(
          "طلبات العملاء لاستبدال تمارين داخل برامجهم — راجعها ووافق باختيار تمرين بديل أو ارفضها.",
          "Client requests to swap exercises in their programs — review and approve with a replacement, or reject.",
        )}
      />

      {/* Analytics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile caption={L("قيد المراجعة", "Pending")} value={analytics.pending} tone="warning" />
        <StatTile caption={L("تمت الموافقة", "Approved")} value={analytics.approved} tone="success" />
        <StatTile caption={L("مرفوض", "Rejected")} value={analytics.rejected} tone="destructive" />
        <StatTile
          caption={L("متوسط وقت الرد", "Avg. response time")}
          value={analytics.avgResponseHours != null ? `${analytics.avgResponseHours}${L("س", "h")}` : "—"}
        />
      </div>

      {(analytics.topExercises.length > 0 || analytics.topQuickReasons.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{L("أكثر التمارين طلباً للتغيير", "Most requested to replace")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {analytics.topExercises.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                analytics.topExercises.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{locale === "ar" ? e.nameAr : e.nameEn}</span>
                    <Badge variant="secondary">{e.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{L("أكثر الأسباب شيوعاً", "Most common reasons")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {analytics.topQuickReasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                analytics.topQuickReasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{quickReasonLabel(r.key)}</span>
                    <Badge variant="secondary">{r.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={L("لا توجد طلبات", "No requests")}
          description={L("ستظهر طلبات تغيير التمارين هنا عند إرسالها من العملاء.", "Exercise change requests will appear here when clients send them.")}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("العميل", "Client")}</TableHead>
                  <TableHead className="hidden md:table-cell">{L("البرنامج", "Program")}</TableHead>
                  <TableHead>{L("التمرين", "Exercise")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{L("السبب", "Quick reason")}</TableHead>
                  <TableHead>{L("الحالة", "Status")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{L("التاريخ", "Date")}</TableHead>
                  <TableHead className="w-40 text-end">{L("إجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell">{locale === "ar" ? r.programNameAr : r.programNameEn}</TableCell>
                    <TableCell>{locale === "ar" ? r.exerciseNameAr : r.exerciseNameEn}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{quickReasonLabel(r.quickReason)}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell" dir="ltr">{new Date(r.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewRow(r)} aria-label={L("عرض", "View")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && r.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="text-success" onClick={() => setApproveRow(r)} aria-label={L("موافقة", "Approve")}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRejectRow(r)} aria-label={L("رفض", "Reject")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ViewDialog row={viewRow} onClose={() => setViewRow(null)} />
      {canApprove && <ApproveDialog row={approveRow} onClose={() => setApproveRow(null)} />}
      {canApprove && <RejectDialog row={rejectRow} onClose={() => setRejectRow(null)} />}
    </div>
  );
}

function StatTile({ caption, value, tone }: { caption: string; value: number | string; tone?: "warning" | "success" | "destructive" }) {
  const toneClass =
    tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className={cn("text-2xl font-bold", toneClass)}>{value}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

function ViewDialog({ row, onClose }: { row: RequestRow | null; onClose: () => void }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  if (!row) return null;
  const quickReasonLabel = row.quickReason ? label(EXERCISE_CHANGE_QUICK_REASON_LABELS, row.quickReason, locale) : "—";
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{L("تفاصيل الطلب", "Request details")}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Field caption={L("العميل", "Client")}>{row.clientName}</Field>
          <Field caption={L("البرنامج", "Program")}>{locale === "ar" ? row.programNameAr : row.programNameEn}</Field>
          <Field caption={L("التمرين", "Exercise")}>{locale === "ar" ? row.exerciseNameAr : row.exerciseNameEn}</Field>
          <Field caption={L("السبب السريع", "Quick reason")}>{quickReasonLabel}</Field>
          {row.reason && <Field caption={L("التفاصيل", "Details")}>{row.reason}</Field>}
          <Field caption={L("الحالة", "Status")}>
            <Badge variant={STATUS_VARIANT[row.status]}>{label(REQUEST_STATUS_LABELS, row.status, locale)}</Badge>
          </Field>
          {row.status === "approved" && (row.replacementNameAr || row.replacementNameEn) && (
            <Field caption={L("التمرين البديل", "Replacement")}>{locale === "ar" ? row.replacementNameAr : row.replacementNameEn}</Field>
          )}
          {row.coachNote && <Field caption={L("ملاحظة المدرب", "Coach's note")}>{row.coachNote}</Field>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{L("إغلاق", "Close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{caption}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function ApproveDialog({ row, onClose }: { row: RequestRow | null; onClose: () => void }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [picked, setPicked] = useState<ExercisePickerItem | null>(null);
  const [coachNote, setCoachNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset when opening for a new request.
  useEffect(() => {
    if (row) {
      setPicked(null);
      setCoachNote("");
      setSubmitting(false);
    }
  }, [row]);

  if (!row) return null;

  async function submit() {
    if (!picked || !row) return;
    setSubmitting(true);
    const res = await approveExerciseChangeRequestAction(row.id, {
      replacementExerciseId: picked.id,
      replacementExerciseNameAr: picked.nameAr,
      replacementExerciseNameEn: picked.nameEn,
      coachNote: coachNote.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success(L("تم تغيير التمرين وإشعار العميل.", "Exercise changed and the client was notified."));
      onClose();
      router.refresh();
    } else {
      toast.error(res.error || L("تعذر تنفيذ الطلب.", "Couldn't complete the request."));
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{L("الموافقة واختيار تمرين بديل", "Approve & pick a replacement")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {L("استبدال", "Replacing")}{" "}
          <span className="font-semibold text-foreground">{locale === "ar" ? row.exerciseNameAr : row.exerciseNameEn}</span>{" "}
          {L("في برنامج", "in")}{" "}
          <span className="font-semibold text-foreground">{row.clientName}</span>
        </p>

        <ExercisePickerInline picked={picked} onPick={setPicked} />

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">{L("ملاحظة للعميل (اختياري)", "Note to client (optional)")}</label>
          <textarea
            value={coachNote}
            maxLength={500}
            onChange={(e) => setCoachNote(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{L("إلغاء", "Cancel")}</Button>
          <Button onClick={submit} disabled={!picked || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {L("تأكيد التغيير", "Confirm change")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExercisePickerInline({
  picked,
  onPick,
}: {
  picked: ExercisePickerItem | null;
  onPick: (ex: ExercisePickerItem) => void;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [tab, setTab] = useState<"system" | "mine">("system");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ExercisePickerItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await searchExercisesAction(q, "all", tab);
      if (res.ok) setResults(res.data!.items);
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q, tab]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {(["system", "mine"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              tab === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
            )}
          >
            {v === "system" ? L("تمارين النظام", "System exercises") : L("مكتبتي", "My library")}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("بحث عن تمرين...", "Search exercises...")} className="ps-9" />
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <p className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{L("لا نتائج", "No results")}</p>
        ) : (
          results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onPick(ex)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-start transition-colors hover:bg-accent",
                picked?.id === ex.id && "border-primary bg-primary/5",
              )}
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                <ExerciseMedia
                  media={{ videoUrl: ex.videoUrl, youtubeUrl: ex.youtubeUrl, imageUrlStart: ex.imageUrlStart, imageUrlEnd: ex.imageUrlEnd, gifUrl: ex.gifUrl }}
                  alt={locale === "ar" ? ex.nameAr : ex.nameEn}
                  className="absolute inset-0 flex h-full w-full items-center justify-center"
                  iconClassName="h-5 w-5 text-muted-foreground/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{locale === "ar" ? ex.nameAr : ex.nameEn}</p>
                {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">{ex.targetMuscles.join("، ")}</p>
                )}
              </div>
              {picked?.id === ex.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function RejectDialog({ row, onClose }: { row: RequestRow | null; onClose: () => void }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [coachNote, setCoachNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row) {
      setCoachNote("");
      setSubmitting(false);
    }
  }, [row]);

  if (!row) return null;

  async function submit() {
    if (!row) return;
    setSubmitting(true);
    const res = await rejectExerciseChangeRequestAction(row.id, coachNote.trim() || undefined);
    setSubmitting(false);
    if (res.ok) {
      toast.success(L("تم رفض الطلب وإشعار العميل.", "Request rejected and the client was notified."));
      onClose();
      router.refresh();
    } else {
      toast.error(res.error || L("تعذر تنفيذ الطلب.", "Couldn't complete the request."));
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{L("رفض الطلب", "Reject request")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {L("رفض طلب تغيير", "Rejecting the request to change")}{" "}
          <span className="font-semibold text-foreground">{locale === "ar" ? row.exerciseNameAr : row.exerciseNameEn}</span>
        </p>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">{L("ملاحظة للعميل (اختياري)", "Note to client (optional)")}</label>
          <textarea
            value={coachNote}
            maxLength={500}
            onChange={(e) => setCoachNote(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{L("إلغاء", "Cancel")}</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {L("تأكيد الرفض", "Confirm rejection")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
