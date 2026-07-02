"use client";

import { Check, MessageCircle, Wallet, Smartphone, Crown, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/utils";
import { SubscriptionCountdown } from "@/components/dashboard/subscription-countdown";
import { getCoachSubscriptionLiveAction } from "@/lib/actions/subscription";
import { coachIsFrozen } from "@/lib/permissions";
import type { AccountStatus } from "@/lib/constants";

export interface PlanCard {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  durationDays: number;
  maxClients: number;
}

/** "شهر" for a 30-day plan, "٣ أشهر" for a 90-day quarterly plan, etc. — derived from durationDays. */
function planDurationLabel(durationDays: number, locale: "ar" | "en"): string {
  const months = Math.round(durationDays / 30);
  if (locale === "en") return months === 1 ? "mo" : `${months} mo`;
  if (months === 1) return "شهر";
  if (months === 2) return "شهرين";
  return `${months} أشهر`;
}

export function SubscriptionView({
  status,
  endDate,
  planName,
  planDurationDays,
  whatsapp,
  plans,
}: {
  status: AccountStatus;
  endDate: string | null;
  planName: string | null;
  planDurationDays: number | null;
  whatsapp: string;
  plans: PlanCard[];
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
              {planName && (
                <p className="text-sm text-muted-foreground">
                  {planName}
                  {planDurationDays != null && (
                    <> · {L("مدة الاشتراك", "Duration")}: {planDurationLabel(planDurationDays, locale)}</>
                  )}
                </p>
              )}
              {(status === "trial" || status === "active") && endDate && (
                <div className="mt-1">
                  <SubscriptionCountdown
                    endDate={endDate}
                    expired={coachIsFrozen(status)}
                    onPoll={async () => {
                      const res = await getCoachSubscriptionLiveAction();
                      if (!res.ok) return null;
                      return { expired: coachIsFrozen(res.data!.status), endDate: res.data!.endDate };
                    }}
                  />
                </div>
              )}
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
        {plans.map((p) => {
          const isCurrent = planName === p.nameAr || planName === p.nameEn;
          return (
            <Card key={p.id} className={isCurrent ? "relative border-primary shadow-md" : ""}>
              {isCurrent && (
                <Badge className="absolute -top-2.5 start-1/2 -translate-x-1/2">{L("باقتك الحالية", "Your current plan")}</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{locale === "ar" ? p.nameAr : p.nameEn}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatNumber(p.price, locale)}</span>
                  <span className="text-sm text-muted-foreground">{L("ج.م", "EGP")} / {planDurationLabel(p.durationDays, locale)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {L(`حتى ${p.maxClients} عميل`, `Up to ${p.maxClients} clients`)}
                </div>
                <Button asChild variant={isCurrent ? "default" : "outline"} className="mt-2 w-full">
                  <a href={waLink} target="_blank" rel="noopener noreferrer">{t.account.upgradeNow}</a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
