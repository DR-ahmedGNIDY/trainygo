"use client";

import { useState, useTransition } from "react";
import { Save, User, Lock, Palette, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/components/providers/i18n-provider";
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import { updateOwnProfileAction, changeOwnPasswordAction } from "@/lib/actions/client";
import type { ClientGoal } from "@/lib/constants";

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

export function ProfileView({ self }: { self: ClientSelf }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [savingP, startP] = useTransition();
  const [savedP, setSavedP] = useState(false);
  const [form, setForm] = useState({ name: self.name, phone: self.phone, height: self.height?.toString() ?? "", weight: self.weight?.toString() ?? "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, startPw] = useTransition();
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function saveProfile() {
    startP(async () => {
      await updateOwnProfileAction({ name: form.name, phone: form.phone, height: form.height ? Number(form.height) : undefined, weight: form.weight ? Number(form.weight) : undefined });
      setSavedP(true);
      setTimeout(() => setSavedP(false), 2000);
    });
  }

  function changePw() {
    setPwMsg(null);
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t.auth.passwordsMismatch }); return; }
    startPw(async () => {
      const res = await changeOwnPasswordAction(pw.current, pw.next);
      if (res.ok) { setPwMsg({ ok: true, text: t.common.saved }); setPw({ current: "", next: "", confirm: "" }); }
      else setPwMsg({ ok: false, text: L("كلمة المرور الحالية غير صحيحة", "Current password is incorrect") });
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
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4 text-primary" />{L("تغيير كلمة المرور", "Change password")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>{L("كلمة المرور الحالية", "Current password")}</Label><Input type="password" dir="ltr" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{L("كلمة مرور جديدة", "New password")}</Label><Input type="password" dir="ltr" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t.auth.confirmPassword}</Label><Input type="password" dir="ltr" value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} /></div>
            {pwMsg && <p className={`text-sm sm:col-span-2 ${pwMsg.ok ? "text-success" : "text-destructive"}`}>{pwMsg.text}</p>}
            <div className="sm:col-span-2 flex justify-end"><Button onClick={changePw} disabled={savingPw || !pw.current || !pw.next}>{savingPw && <Loader2 className="h-4 w-4 animate-spin" />}{L("تحديث", "Update")}</Button></div>
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
