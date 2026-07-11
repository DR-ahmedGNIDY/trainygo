"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
  Scale,
  Dumbbell,
  Apple,
  Camera,
  Loader2,
  MessageSquare,
  KeyRound,
  Copy,
  Check,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Trophy,
  Timer,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LineTrend } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { GOAL_LABELS, label, EXERCISE_CHANGE_QUICK_REASON_LABELS, REQUEST_STATUS_LABELS } from "@/lib/i18n/labels";
import { updateClientAction, deleteClientAction, resetClientPasswordAction } from "@/lib/actions/clients";
import { startConversationAction } from "@/lib/actions/messages";
import {
  createBlankProgramAction,
  createBlankNutritionPlanAction,
  saveProgramBuilderAction,
  savePlanBuilderAction,
} from "@/lib/actions/programs";
import { WorkoutBuilder, type BWeek } from "@/components/builders/workout-builder";
import { NutritionBuilder } from "@/components/builders/nutrition-builder";
import type { ClientPerformanceAnalysis } from "@/lib/services/workout-analytics";
import type { AccountStatus, ClientGoal, Gender } from "@/lib/constants";
import type { IWorkoutWeek } from "@/models/WorkoutTemplate";
import type { IMeal } from "@/models/NutritionTemplate";
import type { mealsToBuilder } from "@/lib/builder-mappers";

export interface ProfileClient {
  id: string;
  name: string;
  username: string;
  code: string;
  email: string;
  phone: string;
  status: AccountStatus;
  goal?: ClientGoal;
  gender?: Gender;
  age?: number | null;
  height?: number | null;
  currentWeight?: number | null;
  startWeight?: number | null;
}

export interface ClientProgramSummary {
  id: string;
  nameAr: string;
  nameEn: string;
  weeks: IWorkoutWeek[];
}

export interface ClientNutritionSummary {
  id: string;
  nameAr: string;
  nameEn: string;
  meals: ReturnType<typeof mealsToBuilder>;
}

export interface ExerciseChangeHistoryRow {
  id: string;
  status: "pending" | "approved" | "rejected";
  quickReason?: string;
  coachNote: string;
  createdAt: string;
  exerciseNameAr: string;
  exerciseNameEn: string;
  replacementNameAr: string;
  replacementNameEn: string;
}

type Measurement = {
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  arms?: number;
  thighs?: number;
};

export function ClientProfileView({
  client,
  weightSeries,
  history,
  canWrite,
  canAccessWorkout,
  canAccessNutrition,
  program,
  nutritionPlan,
  performanceAnalysis,
  exerciseChangeHistory,
}: {
  client: ProfileClient;
  weightSeries: { label: string; value: number }[];
  history: Measurement[];
  canWrite: boolean;
  canAccessWorkout: boolean;
  canAccessNutrition: boolean;
  program: ClientProgramSummary | null;
  nutritionPlan: ClientNutritionSummary | null;
  performanceAnalysis: ClientPerformanceAnalysis;
  exerciseChangeHistory: ExerciseChangeHistoryRow[];
}) {
  const { t, locale, dir } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [creatingProgram, startCreatingProgram] = useTransition();
  const [creatingPlan, startCreatingPlan] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [programState, setProgramState] = useState(program);
  const [nutritionState, setNutritionState] = useState(nutritionPlan);

  const latest = history[history.length - 1];
  const first = history[0];
  const lostKg =
    client.startWeight && client.currentWeight
      ? client.startWeight - client.currentWeight
      : 0;

  const measureFields: { key: keyof Measurement; label: string; unit: string }[] = [
    { key: "weight", label: t.client.currentWeight, unit: "kg" },
    { key: "chest", label: L("الصدر", "Chest"), unit: "cm" },
    { key: "waist", label: L("الخصر", "Waist"), unit: "cm" },
    { key: "arms", label: L("الذراع", "Arms"), unit: "cm" },
    { key: "thighs", label: L("الفخذ", "Thighs"), unit: "cm" },
    { key: "bodyFat", label: L("نسبة الدهون", "Body fat"), unit: "%" },
  ];

  function onDelete() {
    if (!window.confirm(`${t.common.delete}: ${client.name}?`)) return;
    startTransition(async () => {
      await deleteClientAction(client.id);
      router.push("/coach/clients");
    });
  }

  function createProgram() {
    const nameAr = L(`برنامج ${client.name}`, `${client.name}'s program`);
    const nameEn = `${client.name}'s program`;
    startCreatingProgram(async () => {
      const res = await createBlankProgramAction(client.id, { nameAr, nameEn });
      if (res.ok) {
        setProgramState({
          id: res.data!.id,
          nameAr,
          nameEn,
          weeks: [{ weekNumber: 1, name: { ar: "الأسبوع 1", en: "Week 1" }, days: [] }] as unknown as IWorkoutWeek[],
        });
      }
    });
  }

  function createNutritionPlan() {
    const nameAr = L(`نظام غذائي ${client.name}`, `${client.name}'s nutrition plan`);
    const nameEn = `${client.name}'s nutrition plan`;
    startCreatingPlan(async () => {
      const res = await createBlankNutritionPlanAction(client.id, { nameAr, nameEn });
      if (res.ok) {
        setNutritionState({ id: res.data!.id, nameAr, nameEn, meals: [] });
      }
    });
  }

  async function saveProgram(data: { nameAr: string; nameEn: string; weeks: BWeek[] }) {
    if (!programState) return { ok: false as const, error: "NOT_FOUND", code: "NOT_FOUND" };
    const res = await saveProgramBuilderAction(programState.id, {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      weeks: data.weeks as unknown as IWorkoutWeek[],
    });
    if (res.ok) setProgramState((p) => (p ? { ...p, nameAr: data.nameAr, nameEn: data.nameEn, weeks: data.weeks as unknown as IWorkoutWeek[] } : p));
    return res;
  }

  async function saveNutritionPlan(data: { nameAr: string; nameEn: string; meals: unknown[] }) {
    if (!nutritionState) return { ok: false as const, error: "NOT_FOUND", code: "NOT_FOUND" };
    const res = await savePlanBuilderAction(nutritionState.id, data.meals as IMeal[]);
    if (res.ok) setNutritionState((p) => (p ? { ...p, meals: data.meals as ReturnType<typeof mealsToBuilder> } : p));
    return res;
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2">
        <Link href="/coach/clients">
          <BackArrow className="h-4 w-4" />
          {t.dashboard.coachNav.allClients}
        </Link>
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {client.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {client.code} · @{client.username}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {client.goal && <Badge variant="secondary">{label(GOAL_LABELS, client.goal, locale)}</Badge>}
                <StatusBadge status={client.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await startConversationAction(client.id);
                  if (res.ok) router.push(`/coach/messages?c=${res.data!.id}`);
                })
              }
            >
              <MessageSquare className="h-4 w-4" />
              {t.dashboard.coachNav.messages}
            </Button>
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" />
                    {L("تعديل العميل", "Edit client")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResetOpen(true)}>
                    <KeyRound className="h-4 w-4" />
                    {L("إعادة تعيين كلمة المرور", "Reset password")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    {L("حذف العميل", "Delete client")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full justify-start gap-1 overflow-x-auto scrollbar-thin sm:w-auto sm:flex-wrap sm:overflow-visible">
          <TabsTrigger value="overview" className="shrink-0">{t.dashboard.overview}</TabsTrigger>
          {canAccessWorkout && (
            <TabsTrigger value="program" className="shrink-0">{L("برنامج التمرين", "Workout program")}</TabsTrigger>
          )}
          {canAccessNutrition && (
            <TabsTrigger value="nutrition" className="shrink-0">{t.dashboard.coachNav.nutrition}</TabsTrigger>
          )}
          <TabsTrigger value="progress" className="shrink-0">{t.dashboard.coachNav.progress}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t.client.currentWeight}</p><p className="text-2xl font-bold">{client.currentWeight ?? "—"}{client.currentWeight ? " kg" : ""}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{L("نقطة البداية", "Starting")}</p><p className="text-2xl font-bold">{client.startWeight ?? "—"}{client.startWeight ? " kg" : ""}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{L("التغير", "Change")}</p><p className="text-2xl font-bold text-success">{lostKg > 0 ? `-${lostKg}` : lostKg}{lostKg ? " kg" : ""}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{L("الطول", "Height")}</p><p className="text-2xl font-bold">{client.height ?? "—"}{client.height ? " cm" : ""}</p></CardContent></Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">{t.client.weightTrend}</CardTitle></CardHeader>
            <CardContent>
              {weightSeries.length > 0 ? (
                <LineTrend data={weightSeries} xKey="label" yKey="value" />
              ) : (
                <EmptyState icon={Scale} title={L("لا توجد قياسات بعد", "No measurements yet")} />
              )}
            </CardContent>
          </Card>

          {canAccessWorkout && (
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">{L(`تحليل الأداء — آخر ${performanceAnalysis.periodDays} يوماً`, `Performance analysis — last ${performanceAnalysis.periodDays} days`)}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                {performanceAnalysis.strengthChangePercent != null && performanceAnalysis.strengthChangePercent < 0 ? (
                  <TrendingDown className="mx-auto mb-1 h-4 w-4 text-destructive" />
                ) : (
                  <TrendingUp className="mx-auto mb-1 h-4 w-4 text-success" />
                )}
                <p className="text-lg font-bold">
                  {performanceAnalysis.strengthChangePercent != null ? `${performanceAnalysis.strengthChangePercent > 0 ? "+" : ""}${performanceAnalysis.strengthChangePercent}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{L("زيادة قوة", "Strength change")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <TrendingUp className="mx-auto mb-1 h-4 w-4 text-success" />
                <p className="text-lg font-bold">{performanceAnalysis.topGain ? `+${performanceAnalysis.topGain.deltaKg}kg` : "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{performanceAnalysis.topGain ? (locale === "ar" ? performanceAnalysis.topGain.nameAr : performanceAnalysis.topGain.nameEn) : L("لا يوجد", "None")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <TrendingDown className="mx-auto mb-1 h-4 w-4 text-destructive" />
                <p className="text-lg font-bold">{performanceAnalysis.topLoss ? `${performanceAnalysis.topLoss.deltaKg}kg` : "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{performanceAnalysis.topLoss ? (locale === "ar" ? performanceAnalysis.topLoss.nameAr : performanceAnalysis.topLoss.nameEn) : L("لا يوجد", "None")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <Trophy className="mx-auto mb-1 h-4 w-4 text-amber-500" />
                <p className="text-lg font-bold">{performanceAnalysis.prCount}</p>
                <p className="text-xs text-muted-foreground">{L("رقم قياسي", "PRs")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center sm:col-span-4">
                <Timer className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold">{performanceAnalysis.avgSessionDurationSeconds != null ? `${Math.round(performanceAnalysis.avgSessionDurationSeconds / 60)} ${L("دقيقة", "min")}` : "—"}</p>
                <p className="text-xs text-muted-foreground">{L("متوسط مدة الجلسة", "Avg. session duration")}</p>
              </div>
            </CardContent>
          </Card>
          )}

          {canAccessWorkout && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4" />
                {L("سجل تغييرات التمارين", "Exercise change history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exerciseChangeHistory.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {L("لا توجد طلبات تغيير تمارين بعد.", "No exercise change requests yet.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {exerciseChangeHistory.map((h) => {
                    const variant = h.status === "approved" ? "success" : h.status === "rejected" ? "destructive" : "warning";
                    return (
                      <div key={h.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {locale === "ar" ? h.exerciseNameAr : h.exerciseNameEn}
                            {h.status === "approved" && (h.replacementNameAr || h.replacementNameEn) && (
                              <span className="text-muted-foreground"> → {locale === "ar" ? h.replacementNameAr : h.replacementNameEn}</span>
                            )}
                          </p>
                          <Badge variant={variant}>{label(REQUEST_STATUS_LABELS, h.status, locale)}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span dir="ltr">{new Date(h.createdAt).toLocaleDateString("en-GB")}</span>
                          {h.quickReason && <span>· {label(EXERCISE_CHANGE_QUICK_REASON_LABELS, h.quickReason, locale)}</span>}
                        </div>
                        {h.coachNote && (
                          <p className="mt-1.5 text-xs text-foreground">
                            <span className="text-muted-foreground">{L("ملاحظة المدرب: ", "Coach's note: ")}</span>
                            {h.coachNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {canAccessWorkout && (
        <TabsContent value="program">
          {programState ? (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">{L("نسخة مستقلة لهذا العميل — تعديلها لا يؤثر على أي قالب.", "An independent copy for this client — editing it never affects any template.")}</p>
              <WorkoutBuilder
                flat
                initialNameAr={programState.nameAr}
                initialNameEn={programState.nameEn}
                initialWeeks={programState.weeks as unknown as BWeek[]}
                onSave={saveProgram}
              />
            </div>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title={L("لا يوجد برنامج تمرين", "No workout program yet")}
              description={L("أنشئ برنامج تمرين خاصاً بهذا العميل.", "Create a workout program for this client.")}
            >
              {canWrite && (
                <Button onClick={createProgram} disabled={creatingProgram}>
                  {creatingProgram && <Loader2 className="h-4 w-4 animate-spin" />}
                  {L("إنشاء برنامج تمرين", "Create workout program")}
                </Button>
              )}
            </EmptyState>
          )}
        </TabsContent>
        )}

        {canAccessNutrition && (
        <TabsContent value="nutrition">
          {nutritionState ? (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">{L("نسخة مستقلة لهذا العميل — تعديلها لا يؤثر على أي قالب.", "An independent copy for this client — editing it never affects any template.")}</p>
              <NutritionBuilder
                initialNameAr={nutritionState.nameAr}
                initialNameEn={nutritionState.nameEn}
                initialMeals={nutritionState.meals}
                onSave={saveNutritionPlan}
              />
            </div>
          ) : (
            <EmptyState
              icon={Apple}
              title={L("لا يوجد نظام غذائي", "No nutrition plan yet")}
              description={L("أنشئ نظاماً غذائياً خاصاً بهذا العميل.", "Create a nutrition plan for this client.")}
            >
              {canWrite && (
                <Button onClick={createNutritionPlan} disabled={creatingPlan}>
                  {creatingPlan && <Loader2 className="h-4 w-4 animate-spin" />}
                  {L("إنشاء نظام غذائي", "Create nutrition plan")}
                </Button>
              )}
            </EmptyState>
          )}
        </TabsContent>
        )}

        <TabsContent value="progress">
          {history.length === 0 ? (
            <EmptyState icon={Camera} title={L("لا توجد قياسات بعد", "No measurements yet")} description={L("ستظهر القياسات هنا عندما يسجلها العميل.", "Measurements appear here once the client logs them.")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {measureFields.map((f) => {
                const cur = latest?.[f.key] as number | undefined;
                const start = first?.[f.key] as number | undefined;
                const change = cur != null && start != null ? +(cur - start).toFixed(1) : null;
                if (cur == null) return null;
                return (
                  <Card key={f.key}>
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-sm text-muted-foreground">{f.label}</p>
                        <p className="text-xl font-bold">{cur}<span className="text-sm font-normal text-muted-foreground"> {f.unit}</span></p>
                      </div>
                      {change != null && (
                        <Badge variant={change <= 0 ? "success" : "secondary"}>{change > 0 ? "+" : ""}{change}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {canWrite && (
        <>
          <EditClientDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            client={client}
            onSaved={() => { setEditOpen(false); router.refresh(); }}
          />
          <ResetPasswordDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            clientId={client.id}
          />
        </>
      )}
    </div>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  clientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setPassword(null);
      setCopied(false);
    }
  }

  async function generate() {
    setSaving(true);
    const res = await resetClientPasswordAction(clientId);
    setSaving(false);
    if (res.ok) setPassword(res.data!.password);
  }

  function copy() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L("إعادة تعيين كلمة المرور", "Reset password")}</DialogTitle>
        </DialogHeader>
        {!password ? (
          <p className="text-sm text-muted-foreground">
            {L(
              "سيتم إنشاء كلمة مرور جديدة وآمنة لهذا العميل. سيُطلب منه تعيين كلمة مرور خاصة به عند أول تسجيل دخول.",
              "A new secure password will be generated for this client. They'll be required to set their own on first login.",
            )}
          </p>
        ) : (
          <div className="space-y-2">
            <Label>{L("كلمة المرور الجديدة", "New password")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" readOnly value={password} className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {L("شارك هذه الكلمة مع العميل بالطريقة التي تراها مناسبة. لن تظهر مرة أخرى.", "Share this with the client however you prefer. It won't be shown again.")}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>{password ? t.common.close : t.common.cancel}</Button>
          {!password && (
            <Button onClick={generate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {L("إنشاء كلمة مرور جديدة", "Generate new password")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ProfileClient;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email,
    age: client.age?.toString() ?? "",
    gender: client.gender ?? "",
    height: client.height?.toString() ?? "",
    weight: client.currentWeight?.toString() ?? "",
    goal: client.goal ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    await updateClientAction(client.id, {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      age: form.age || undefined,
      gender: (form.gender as Gender) || undefined,
      height: form.height || undefined,
      weight: form.weight || undefined,
      goal: (form.goal as ClientGoal) || undefined,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.common.edit} — {client.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>{t.common.name}</Label><Input value={form.name} onChange={(e) => set("name")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.common.phone}</Label><Input dir="ltr" value={form.phone} onChange={(e) => set("phone")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.common.email}</Label><Input dir="ltr" value={form.email} onChange={(e) => set("email")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("العمر", "Age")}</Label><Input type="number" value={form.age} onChange={(e) => set("age")(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{L("الجنس", "Gender")}</Label>
            <Select value={form.gender} onValueChange={set("gender")}>
              <SelectTrigger><SelectValue placeholder={L("اختر", "Select")} /></SelectTrigger>
              <SelectContent><SelectItem value="male">{L("ذكر", "Male")}</SelectItem><SelectItem value="female">{L("أنثى", "Female")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{L("الطول (سم)", "Height (cm)")}</Label><Input type="number" value={form.height} onChange={(e) => set("height")(e.target.value)} /></div>
          <div className="space-y-2"><Label>{L("الوزن (كجم)", "Weight (kg)")}</Label><Input type="number" value={form.weight} onChange={(e) => set("weight")(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("الهدف", "Goal")}</Label>
            <Select value={form.goal} onValueChange={set("goal")}>
              <SelectTrigger><SelectValue placeholder={L("اختر الهدف", "Select goal")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="muscle_building">{L("زيادة كتلة عضلية", "Muscle Building")}</SelectItem>
                <SelectItem value="fat_loss">{L("نزول في الوزن", "Fat Loss")}</SelectItem>
                <SelectItem value="athletic_conditioning">{L("إعداد بدني", "Athletic Conditioning")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
