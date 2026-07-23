"use client";

import { Save, User, Building2, Bell } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/providers/i18n-provider";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";

export default function CoachSettingsPage() {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.dashboard.coachNav.settings} description={L("إدارة بيانات حسابك وعلامتك التجارية.", "Manage your account and brand details.")} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" />{L("الملف الشخصي", "Profile")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>{t.common.name}</Label><Input defaultValue="Ahmed Hassan" /></div>
            <div className="space-y-2"><Label>{t.common.phone}</Label><Input dir="ltr" defaultValue="+20 100 000 0000" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>{t.common.email}</Label><Input dir="ltr" defaultValue="ahmed@fit.com" disabled /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" />{t.auth.brandName}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>{t.auth.brandName}</Label><Input defaultValue={L("أحمد فيتنس", "Ahmed Fitness")} /></div>
            <div className="space-y-2"><Label>{L("رقم واتساب", "WhatsApp number")}</Label><Input dir="ltr" placeholder="201028676395" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" />{L("التفضيلات", "Preferences")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {L("يمكنك تغيير اللغة والمظهر (فاتح/داكن) من الأزرار أعلى الصفحة، وتُحفظ تلقائياً مع حسابك.", "Change language and light/dark theme from the buttons at the top — they're saved to your account automatically.")}
            </p>
          </CardContent>
        </Card>

        <NotificationPreferencesForm />

        <Separator />
        <div className="flex justify-end">
          <Button><Save className="h-4 w-4" />{t.common.save}</Button>
        </div>
      </div>
    </div>
  );
}
