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
  Target,
  Dumbbell,
  Apple,
  Camera,
  Loader2,
  MessageSquare,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import { updateClientAction, deleteClientAction } from "@/lib/actions/clients";
import { startConversationAction } from "@/lib/actions/messages";
import type { AccountStatus, ClientGoal, Gender } from "@/lib/constants";

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
}: {
  client: ProfileClient;
  weightSeries: { label: string; value: number }[];
  history: Measurement[];
  canWrite: boolean;
}) {
  const { t, locale, dir } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t.common.edit}
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="overview">{t.dashboard.overview}</TabsTrigger>
          <TabsTrigger value="program">{t.dashboard.coachNav.clientPrograms}</TabsTrigger>
          <TabsTrigger value="nutrition">{t.dashboard.coachNav.nutrition}</TabsTrigger>
          <TabsTrigger value="progress">{t.dashboard.coachNav.progress}</TabsTrigger>
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
        </TabsContent>

        <TabsContent value="program">
          <EmptyState
            icon={Dumbbell}
            title={L("لا يوجد برنامج مُسند", "No program assigned")}
            description={L("أسند قالب تدريب لهذا العميل من صفحة برامج العملاء.", "Assign a workout template from the Client Programs page.")}
          >
            <Button asChild variant="outline"><Link href="/coach/programs">{t.dashboard.ui.assignProgram}</Link></Button>
          </EmptyState>
        </TabsContent>

        <TabsContent value="nutrition">
          <EmptyState
            icon={Apple}
            title={L("لا توجد خطة تغذية", "No nutrition plan")}
            description={L("أنشئ خطة تغذية لهذا العميل من صفحة خطط التغذية.", "Create a nutrition plan from the Client Nutrition Plans page.")}
          >
            <Button asChild variant="outline"><Link href="/coach/nutrition/plans">{L("خطط التغذية", "Nutrition plans")}</Link></Button>
          </EmptyState>
        </TabsContent>

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
        <EditClientDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          client={client}
          onSaved={() => { setEditOpen(false); router.refresh(); }}
        />
      )}
    </div>
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
                <SelectItem value="fat_loss">{L("خسارة دهون", "Fat loss")}</SelectItem>
                <SelectItem value="muscle_gain">{L("بناء عضل", "Muscle gain")}</SelectItem>
                <SelectItem value="maintenance">{L("صيانة", "Maintenance")}</SelectItem>
                <SelectItem value="strength">{L("قوة", "Strength")}</SelectItem>
                <SelectItem value="general_fitness">{L("لياقة عامة", "General fitness")}</SelectItem>
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
