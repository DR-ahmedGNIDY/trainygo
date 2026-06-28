"use client";

import { Check, MessageCircle, Wallet, Smartphone, Crown, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import type { AccountStatus } from "@/lib/constants";

const PLANS = [
  { tier: "starter", name: { ar: "المبتدئ", en: "Starter" }, price: 299, clients: 15, popular: false, features: [{ ar: "حتى 15 عميل", en: "Up to 15 clients" }, { ar: "مكتبة التمارين والأطعمة", en: "Exercise & food libraries" }, { ar: "البرامج وخطط التغذية", en: "Programs & nutrition" }] },
  { tier: "pro", name: { ar: "الاحترافي", en: "Pro" }, price: 599, clients: 50, popular: true, features: [{ ar: "حتى 50 عميل", en: "Up to 50 clients" }, { ar: "كل مميزات المبتدئ", en: "Everything in Starter" }, { ar: "المتابعات والمحادثات", en: "Check-ins & messaging" }] },
  { tier: "enterprise", name: { ar: "المتقدم", en: "Enterprise" }, price: 1299, clients: 1000, popular: false, features: [{ ar: "عملاء غير محدودين", en: "Unlimited clients" }, { ar: "كل مميزات الاحترافي", en: "Everything in Pro" }, { ar: "أولوية الدعم", en: "Priority support" }] },
];

export function SubscriptionView({
  status,
  whatsapp,
}: {
  status: AccountStatus;
  whatsapp: string;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const waLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(L("مرحباً، أرغب في تفعيل اشتراك FITXNET", "Hello, I'd like to activate my FITXNET subscription"))}`;

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.subscription} description={L("اختر الباقة المناسبة وتواصل مع الإدارة للتفعيل.", "Choose a plan and contact administration to activate.")} />

      {/* Current status */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${status === "expired" ? "bg-destructive/10 text-destructive" : status === "trial" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
              {status === "expired" ? <AlertTriangle className="h-6 w-6" /> : status === "trial" ? <Clock className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{L("حالة الاشتراك", "Subscription status")}</p>
              <p className="text-lg font-bold">{t.account[status]}</p>
              {status === "trial" && <p className="text-sm text-muted-foreground">{L("استمتع بالفترة التجريبية المجانية.", "Enjoy your free trial.")}</p>}
              {status === "expired" && <p className="text-sm text-destructive">{t.account.trialExpiredDesc}</p>}
            </div>
          </div>
          <Button asChild size="lg" className="gap-2 bg-[#25D366] text-white hover:bg-[#1fb955]">
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              {t.account.contactAdmin}
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.tier} className={p.popular ? "relative border-primary shadow-md" : ""}>
            {p.popular && (
              <Badge className="absolute -top-2.5 start-1/2 -translate-x-1/2">{L("الأكثر شيوعاً", "Most popular")}</Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{p.name[locale]}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{formatNumber(p.price, locale)}</span>
                <span className="text-sm text-muted-foreground">{L("ج.م / شهر", "EGP / mo")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {f[locale]}
                </div>
              ))}
              <Button asChild variant={p.popular ? "default" : "outline"} className="mt-2 w-full">
                <a href={waLink} target="_blank" rel="noopener noreferrer">{t.account.upgradeNow}</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment methods */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{L("طرق الدفع (يدوي)", "Payment methods (offline)")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{L("فودافون كاش", "Vodafone Cash")}</p>
              <p className="text-sm text-muted-foreground">{L("تواصل مع الإدارة لمعرفة الرقم", "Contact admin for the number")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">InstaPay</p>
              <p className="text-sm text-muted-foreground">{L("تواصل مع الإدارة لمعرفة الحساب", "Contact admin for the handle")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
