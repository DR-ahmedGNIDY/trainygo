"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Copy,
  Check,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { useBrand } from "@/components/providers/brand-provider";
import { createClientAction } from "@/lib/actions/clients";
import type { ClientGoal } from "@/lib/constants";

type Form = {
  name: string;
  country: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  goal: string;
  subscriptionMonths: string;
};

const COUNTRIES = [
  { value: "EG", flag: "🇪🇬", ar: "مصر", en: "Egypt", dialCode: "+20" },
  { value: "SA", flag: "🇸🇦", ar: "السعودية", en: "Saudi Arabia", dialCode: "+966" },
  { value: "KW", flag: "🇰🇼", ar: "الكويت", en: "Kuwait", dialCode: "+965" },
  { value: "QA", flag: "🇶🇦", ar: "قطر", en: "Qatar", dialCode: "+974" },
];

const EMPTY: Form = {
  name: "",
  country: "EG",
  phone: "",
  email: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  goal: "",
  subscriptionMonths: "",
};

export function AddClientForm() {
  const { t, locale, dir } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const { academyName } = useBrand();

  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<null | { username: string; password: string; code: string }>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dialCode = COUNTRIES.find((c) => c.value === form.country)?.dialCode ?? "+20";
  const fullPhone = `${dialCode}${form.phone}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await createClientAction({
      name: form.name,
      phone: fullPhone,
      email: form.email || undefined,
      age: form.age || undefined,
      gender: form.gender ? (form.gender as "male" | "female") : undefined,
      height: form.height || undefined,
      weight: form.weight || undefined,
      goal: form.goal ? (form.goal as ClientGoal) : undefined,
      subscriptionMonths: form.subscriptionMonths || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(
        res.code === "COACH_READ_ONLY"
          ? t.account.trialExpiredDesc
          : t.common.errorDescription,
      );
      return;
    }
    setCreds(res.data!.credentials);
  }

  function copyAll() {
    if (!creds) return;
    const text = `${academyName}\n${L("اسم المستخدم", "Username")}: ${creds.username}\n${L("كلمة المرور", "Password")}: ${creds.password}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function whatsappLink() {
    if (!creds) return "#";
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
    const message = L(
      `مرحباً ${form.name}،\nتم إنشاء حسابك في ${academyName}.\nاسم المستخدم: ${creds.username}\nكلمة المرور: ${creds.password}\nرابط تسجيل الدخول: ${loginUrl}`,
      `Hi ${form.name},\nYour ${academyName} account is ready.\nUsername: ${creds.username}\nPassword: ${creds.password}\nLogin link: ${loginUrl}`,
    );
    const digits = fullPhone.replace(/[^\d]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  if (creds) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title={L("تم إنشاء العميل", "Client created")}
          description={L("انسخ بيانات الدخول وأرسلها للعميل.", "Copy the login details and send them to your client.")}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              {L("بيانات دخول العميل", "Client login credentials")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { k: L("اسم المستخدم", "Username"), v: creds.username },
              { k: L("كلمة المرور المؤقتة", "Temporary password"), v: creds.password },
              { k: L("كود العميل", "Client code"), v: creds.code },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">{row.k}</span>
                <code className="font-mono text-sm font-semibold" dir="ltr">{row.v}</code>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={copyAll} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t.common.copied : L("نسخ البيانات", "Copy details")}
              </Button>
              <Button asChild className="gap-2 bg-[#25D366] text-white hover:bg-[#1fb955]">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {L("إرسال واتساب", "Send via WhatsApp")}
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/coach/clients">{L("الذهاب للعملاء", "Go to clients")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.dashboard.coachNav.addClient}
        description={L("سيُنشئ النظام اسم مستخدم وكلمة مرور تلقائياً.", "The system auto-generates a username and password.")}
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t.common.name}</Label>
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{L("الدولة", "Country")}</Label>
                <Select value={form.country} onValueChange={set("country")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.flag} {L(c.ar, c.en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.common.phone}</Label>
                <div className="flex gap-2">
                  <Input dir="ltr" value={dialCode} readOnly disabled className="w-20 shrink-0 text-center" />
                  <Input dir="ltr" value={form.phone} onChange={(e) => set("phone")(e.target.value)} required className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.common.email} <span className="text-xs text-muted-foreground">({t.common.optional})</span></Label>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => set("email")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{L("العمر", "Age")}</Label>
                <Input type="number" min={10} max={100} value={form.age} onChange={(e) => set("age")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{L("الجنس", "Gender")}</Label>
                <Select value={form.gender} onValueChange={set("gender")}>
                  <SelectTrigger><SelectValue placeholder={L("اختر", "Select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{L("ذكر", "Male")}</SelectItem>
                    <SelectItem value="female">{L("أنثى", "Female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{L("الطول (سم)", "Height (cm)")}</Label>
                <Input type="number" value={form.height} onChange={(e) => set("height")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{L("الوزن (كجم)", "Weight (kg)")}</Label>
                <Input type="number" value={form.weight} onChange={(e) => set("weight")(e.target.value)} />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label>{L("مدة الاشتراك", "Subscription duration")}</Label>
                <Select value={form.subscriptionMonths} onValueChange={set("subscriptionMonths")}>
                  <SelectTrigger><SelectValue placeholder={L("اختر المدة", "Select duration")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{L("شهر", "1 month")}</SelectItem>
                    <SelectItem value="3">{L("٣ أشهر", "3 months")}</SelectItem>
                    <SelectItem value="6">{L("٦ أشهر", "6 months")}</SelectItem>
                    <SelectItem value="12">{L("١٢ شهر", "12 months")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline" type="button">
                <Link href="/coach/clients">{t.common.cancel}</Link>
              </Button>
              <Button type="submit" className="gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {t.common.create}
                <Arrow className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
