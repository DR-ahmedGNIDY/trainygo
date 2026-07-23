"use client";

import { Save, Globe, MessageCircle, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/providers/i18n-provider";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";

export default function AdminSettingsPage() {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.dashboard.adminNav.settings} description={L("إعدادات المنصة العامة.", "Platform-wide settings.")} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" />{L("هوية المنصة", "Platform identity")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>{L("اسم المنصة", "Platform name")}</Label><Input defaultValue="FITXNET" /></div>
            <div className="space-y-2"><Label>{L("الدومين", "Domain")}</Label><Input dir="ltr" defaultValue="fitxnet.com" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>{L("بريد الدعم", "Support email")}</Label><Input dir="ltr" defaultValue="support@fitxnet.com" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4 text-primary" />{L("التواصل", "Contact")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{L("رقم واتساب الإدارة", "Admin WhatsApp number")}</Label>
              <Input dir="ltr" defaultValue="201028676395" />
              <p className="text-xs text-muted-foreground">{L("يُستخدم في زر «تواصل مع الإدارة» لدى المدربين.", "Used by the coaches' “Contact Administration” button.")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" />{L("الدفع اليدوي", "Offline payment")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>{L("رقم فودافون كاش", "Vodafone Cash number")}</Label><Input dir="ltr" placeholder="01028676395" /></div>
            <div className="space-y-2"><Label>{L("حساب InstaPay", "InstaPay handle")}</Label><Input dir="ltr" placeholder="@handle" /></div>
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
