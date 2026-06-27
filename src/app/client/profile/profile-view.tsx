"use client";

import { useState, useTransition } from "react";
import { Save, User, Palette, Loader2, Trophy, Dumbbell, Activity, Clock, Weight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/components/providers/i18n-provider";
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import { updateOwnProfileAction } from "@/lib/actions/client";
import type { ClientGoal } from "@/lib/constants";
import type { ClientPerformanceStats } from "@/lib/services/workout-analytics";

export interface ClientSelf {
  name: string;
  username: string;
  code: string;
  goal?: ClientGoal;
  coachName: string;
  phone: string;
  height: number | null;
  weight: number | null;
}

export function ProfileView({ self, stats }: { self: ClientSelf; stats: ClientPerformanceStats }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [savingP, startP] = useTransition();
  const [savedP, setSavedP] = useState(false);
  const [form, setForm] = useState({ name: self.name, phone: self.phone, height: self.height?.toString() ?? "", weight: self.weight?.toString() ?? "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  function saveProfile() {
    startP(async () => {
      await updateOwnProfileAction({ name: form.name, phone: form.phone, height: form.height ? Number(form.height) : undefined, weight: form.weight ? Number(form.weight) : undefined });
      setSavedP(true);
      setTimeout(() => setSavedP(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.dashboard.clientNav.profile} description={L("بياناتك وتفضيلاتك.", "Your details and preferences.")} />

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-start">
          <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary/10 text-2xl text-primary">{self.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{self.name}</h2>
            <p className="text-sm text-muted-foreground" dir="ltr">{self.code} · @{self.username}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {self.goal && <Badge variant="secondary">{label(GOAL_LABELS, self.goal, locale)}</Badge>}
              <Badge variant="outline">{L("المدرب:", "Coach:")} {self.coachName}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" />{L("إحصائيات الأداء", "Performance stats")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <Trophy className="mx-auto mb-1 h-4 w-4 text-amber-500" />
              <p className="text-lg font-bold">{stats.totalPRs}</p>
              <p className="text-xs text-muted-foreground">{L("أرقام قياسية", "Total PRs")}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Dumbbell className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="truncate text-sm font-bold">{stats.bestExercise ? (locale === "ar" ? stats.bestExercise.nameAr : stats.bestExercise.nameEn) : "—"}</p>
              <p className="text-xs text-muted-foreground">{L("أفضل تمرين", "Best exercise")}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Activity className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="truncate text-sm font-bold">{stats.mostImprovedMuscle ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{L("أكثر عضلة تطورت", "Most improved muscle")}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Activity className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold">{stats.avgAdherencePercent != null ? `${stats.avgAdherencePercent}%` : "—"}</p>
              <p className="text-xs text-muted-foreground">{L("متوسط الالتزام", "Avg. adherence")}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold">{stats.avgSessionDurationSeconds != null ? `${Math.round(stats.avgSessionDurationSeconds / 60)} ${L("د", "min")}` : "—"}</p>
              <p className="text-xs text-muted-foreground">{L("متوسط مدة الجلسة", "Avg. session length")}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Weight className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold">{stats.totalVolumeKg.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{L("إجمالي الحجم (كجم)", "Total volume (kg)")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" />{L("البيانات الشخصية", "Personal details")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>{t.common.name}</Label><Input value={form.name} onChange={(e) => set("name")(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t.common.phone}</Label><Input dir="ltr" value={form.phone} onChange={(e) => set("phone")(e.target.value)} /></div>
            <div className="space-y-2"><Label>{L("الطول (سم)", "Height (cm)")}</Label><Input type="number" value={form.height} onChange={(e) => set("height")(e.target.value)} /></div>
            <div className="space-y-2"><Label>{L("الوزن الحالي (كجم)", "Current weight (kg)")}</Label><Input type="number" value={form.weight} onChange={(e) => set("weight")(e.target.value)} /></div>
            <div className="sm:col-span-2 flex justify-end"><Button onClick={saveProfile} disabled={savingP}>{savingP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savedP ? t.common.saved : t.common.save}</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" />{L("التفضيلات", "Preferences")}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{L("غيّر اللغة والمظهر من الأزرار أعلى الصفحة — تُحفظ مع حسابك.", "Change language and theme from the top buttons — saved to your account.")}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
