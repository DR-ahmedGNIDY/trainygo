"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Flame,
  MoreHorizontal,
  Trash2,
  StickyNote,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatFullDateTime } from "@/lib/utils";
import {
  markErrorLogResolvedAction,
  addErrorLogNoteAction,
  deleteErrorLogAction,
} from "@/lib/actions/error-logs";

export interface ErrorLogRow {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  stack?: string;
  code?: string;
  coachName?: string;
  email?: string;
  route?: string;
  action?: string;
  context?: Record<string, unknown>;
  browser?: string;
  device?: string;
  ipAddress?: string;
  environment: string;
  resolved: boolean;
  resolvedByName?: string;
  resolvedAt?: string | null;
  notes?: string;
  createdAt: string;
}

export interface ErrorLogStats {
  critical: number;
  open: number;
  resolvedToday: number;
  mostFrequent: { message: string; type: string; count: number } | null;
}

const SEVERITY_BADGE: Record<ErrorLogRow["severity"], "secondary" | "warning" | "destructive"> = {
  info: "secondary",
  warning: "warning",
  error: "destructive",
  critical: "destructive",
};

export function SystemLogsView({ logs, stats }: { logs: ErrorLogRow[]; stats: ErrorLogStats }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [range, setRange] = useState("all");
  const [coachQuery, setCoachQuery] = useState("");
  const [type, setType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [resolved, setResolved] = useState("all");
  const [detail, setDetail] = useState<ErrorLogRow | null>(null);
  const [noteFor, setNoteFor] = useState<ErrorLogRow | null>(null);

  const types = useMemo(() => Array.from(new Set(logs.map((l) => l.type))).sort(), [logs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const rangeMs = range === "today" ? 0 : range === "7d" ? 7 * 86_400_000 : range === "30d" ? 30 * 86_400_000 : null;
    return logs.filter((l) => {
      if (rangeMs !== null) {
        const start = range === "today" ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() : now - rangeMs;
        if (new Date(l.createdAt).getTime() < start) return false;
      }
      if (coachQuery.trim()) {
        const q = coachQuery.trim().toLowerCase();
        const hay = `${l.coachName ?? ""} ${l.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (type !== "all" && l.type !== type) return false;
      if (severity !== "all" && l.severity !== severity) return false;
      if (resolved !== "all" && String(l.resolved) !== resolved) return false;
      return true;
    });
  }, [logs, range, coachQuery, type, severity, resolved]);

  function toggleResolved(log: ErrorLogRow) {
    startTransition(async () => {
      await markErrorLogResolvedAction(log.id, !log.resolved);
      router.refresh();
    });
  }
  function removeLog(log: ErrorLogRow) {
    if (!window.confirm(L("حذف هذا السجل نهائياً؟", "Permanently delete this log?"))) return;
    startTransition(async () => {
      await deleteErrorLogAction(log.id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title={L("سجل الأخطاء", "System Logs")} description={L("أخطاء النظام المسجلة تلقائياً.", "Automatically captured system errors.")} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label={L("أخطاء حرجة", "Critical errors")} value={stats.critical} tone="destructive" />
        <StatCard icon={ShieldAlert} label={L("مشاكل مفتوحة", "Open issues")} value={stats.open} tone="warning" />
        <StatCard icon={CheckCircle2} label={L("حُلّت اليوم", "Resolved today")} value={stats.resolvedToday} tone="success" />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L("الخطأ الأكثر تكراراً", "Most frequent error")}</p>
            {stats.mostFrequent ? (
              <>
                <p className="mt-1 truncate text-sm font-semibold" title={stats.mostFrequent.message}>{stats.mostFrequent.message}</p>
                <p className="text-xs text-muted-foreground">{stats.mostFrequent.type} — {stats.mostFrequent.count}×</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{L("كل الفترات", "All time")}</SelectItem>
            <SelectItem value="today">{L("اليوم", "Today")}</SelectItem>
            <SelectItem value="7d">{L("آخر 7 أيام", "Last 7 days")}</SelectItem>
            <SelectItem value="30d">{L("آخر 30 يوم", "Last 30 days")}</SelectItem>
          </SelectContent>
        </Select>
        <Input value={coachQuery} onChange={(e) => setCoachQuery(e.target.value)} placeholder={L("بحث بالمدرب / الإيميل", "Search coach / email")} className="w-56" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48"><SelectValue placeholder={L("النوع", "Type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{L("كل الأنواع", "All types")}</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40"><SelectValue placeholder={L("الخطورة", "Severity")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{L("كل المستويات", "All severities")}</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resolved} onValueChange={setResolved}>
          <SelectTrigger className="w-40"><SelectValue placeholder={L("الحالة", "Resolved")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{L("الكل", "All")}</SelectItem>
            <SelectItem value="false">{L("غير محلول", "Open")}</SelectItem>
            <SelectItem value="true">{L("محلول", "Resolved")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={L("لا توجد أخطاء", "No errors")} description={L("لا توجد سجلات مطابقة للفلاتر الحالية.", "No logs match the current filters.")} />
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("التاريخ", "Date")}</TableHead>
                  <TableHead>{L("النوع", "Type")}</TableHead>
                  <TableHead>{L("الخطورة", "Severity")}</TableHead>
                  <TableHead className="hidden md:table-cell">{L("المدرب", "Coach")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{L("الإيميل", "Email")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{L("العملية", "Action")}</TableHead>
                  <TableHead>{L("الرسالة", "Message")}</TableHead>
                  <TableHead>{L("الحالة", "Resolved")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatFullDateTime(l.createdAt, locale)}</TableCell>
                    <TableCell className="text-xs">{l.type}</TableCell>
                    <TableCell><Badge variant={SEVERITY_BADGE[l.severity]}>{l.severity}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">{l.coachName ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell" dir="ltr">{l.email ?? "—"}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{l.action ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm" title={l.message}>{l.message}</TableCell>
                    <TableCell>
                      {l.resolved ? (
                        <Badge variant="success">{L("محلول", "Resolved")}</Badge>
                      ) : (
                        <Badge variant="outline">{L("مفتوح", "Open")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(l)}><Eye className="h-4 w-4" />{L("عرض التفاصيل", "View details")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleResolved(l)}>
                            <CheckCircle2 className="h-4 w-4" />
                            {l.resolved ? L("إعادة فتح", "Reopen") : L("وضع كمحلول", "Mark resolved")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setNoteFor(l)}><StickyNote className="h-4 w-4" />{L("إضافة ملاحظة", "Add notes")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removeLog(l)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{L("حذف", "Delete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DetailDialog log={detail} onClose={() => setDetail(null)} locale={locale} />
      <NoteDialog log={noteFor} onClose={() => setNoteFor(null)} onDone={() => { setNoteFor(null); router.refresh(); }} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  tone: "destructive" | "warning" | "success";
}) {
  const toneClass = {
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 shrink-0 ${toneClass}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailDialog({
  log,
  onClose,
  locale,
}: {
  log: ErrorLogRow | null;
  onClose: () => void;
  locale: "ar" | "en";
}) {
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{log?.type}</DialogTitle></DialogHeader>
        {log && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label={L("التاريخ", "Date")} value={formatFullDateTime(log.createdAt, locale)} />
              <Field label={L("الخطورة", "Severity")} value={log.severity} />
              <Field label={L("المدرب", "Coach")} value={log.coachName ?? "—"} />
              <Field label={L("الإيميل", "Email")} value={log.email ?? "—"} />
              <Field label={L("المسار", "Route")} value={log.route ?? "—"} />
              <Field label={L("العملية", "Action")} value={log.action ?? "—"} />
              <Field label={L("البيئة", "Environment")} value={log.environment} />
              <Field label={L("الجهاز", "Device")} value={log.device ?? "—"} />
              <Field label="IP" value={log.ipAddress ?? "—"} />
              <Field label={L("الكود", "Code")} value={log.code ?? "—"} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{L("الرسالة", "Message")}</p>
              <p className="rounded-md bg-muted/40 p-3">{log.message}</p>
            </div>
            {log.context && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Context</p>
                <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs" dir="ltr">{JSON.stringify(log.context, null, 2)}</pre>
              </div>
            )}
            {log.stack && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Stack trace</p>
                <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs" dir="ltr">{log.stack}</pre>
              </div>
            )}
            {log.notes && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{L("ملاحظات", "Notes")}</p>
                <p className="rounded-md bg-muted/40 p-3">{log.notes}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>{L("إغلاق", "Close")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium" dir="ltr">{value}</p>
    </div>
  );
}

function NoteDialog({
  log,
  onClose,
  onDone,
}: {
  log: ErrorLogRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(log?.notes ?? "");
  }, [log]);

  async function save() {
    if (!log) return;
    setSaving(true);
    await addErrorLogNoteAction(log.id, notes);
    setSaving(false);
    setNotes("");
    onDone();
  }

  return (
    <Dialog open={!!log} onOpenChange={(o) => { if (!o) { setNotes(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{L("إضافة ملاحظة", "Add notes")}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>{L("ملاحظات", "Notes")}</Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setNotes(""); onClose(); }}>{L("إلغاء", "Cancel")}</Button>
          <Button onClick={save} disabled={saving}>{L("حفظ", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
