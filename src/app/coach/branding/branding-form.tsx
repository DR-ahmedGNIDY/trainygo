"use client";

import { useState, useTransition } from "react";
import { Save, Building2, Palette, SlidersHorizontal, Loader2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { useI18n } from "@/components/providers/i18n-provider";
import { updateBrandingAction, resetBrandingAction } from "@/lib/actions/branding";
import { FITXNET_DEFAULT_BRAND, type BrandSettings } from "@/lib/services/brand-settings";

const COLOR_FIELDS: { key: keyof BrandSettings; ar: string; en: string }[] = [
  { key: "primaryColor", ar: "اللون الأساسي", en: "Primary color" },
  { key: "secondaryColor", ar: "اللون الثانوي", en: "Secondary color" },
  { key: "buttonColor", ar: "لون الأزرار", en: "Button color" },
  { key: "headerColor", ar: "لون الترويسة", en: "Header color" },
  { key: "sidebarColor", ar: "لون الشريط الجانبي", en: "Sidebar color" },
  { key: "linkColor", ar: "لون الروابط", en: "Link color" },
];

type FormState = {
  academyName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  headerColor: string;
  sidebarColor: string;
  linkColor: string;
  loginImage?: string;
  dashboardImage?: string;
  favicon?: string;
  showFitxnetBadge: boolean;
};

export function BrandingForm({ initialBrand }: { initialBrand: BrandSettings | null }) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const base: FormState = { ...FITXNET_DEFAULT_BRAND, ...(initialBrand ?? {}) };
  const [form, setForm] = useState<FormState>(base);
  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const [saving, startSave] = useTransition();
  const [resetting, startReset] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await updateBrandingAction({
        academyName: form.academyName,
        logo: form.logo,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        buttonColor: form.buttonColor,
        headerColor: form.headerColor,
        sidebarColor: form.sidebarColor,
        linkColor: form.linkColor,
        loginImage: form.loginImage,
        dashboardImage: form.dashboardImage,
        favicon: form.favicon,
        showFitxnetBadge: form.showFitxnetBadge,
      });
      if (!res.ok) {
        setMsg({ type: "error", text: L("تعذّر حفظ إعدادات العلامة التجارية", "Could not save branding settings") });
        return;
      }
      setMsg({ type: "ok", text: L("تم حفظ إعدادات العلامة التجارية", "Branding settings saved") });
    });
  }

  function reset() {
    setMsg(null);
    startReset(async () => {
      const res = await resetBrandingAction();
      if (!res.ok) {
        setMsg({ type: "error", text: L("تعذّر إعادة التعيين", "Could not reset branding") });
        return;
      }
      setForm({ ...FITXNET_DEFAULT_BRAND });
      setMsg({ type: "ok", text: L("تمت إعادة التعيين إلى الإعدادات الافتراضية", "Reset to defaults") });
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={L("هوية العلامة التجارية", "Branding")}
        description={L(
          "خصّص شعار وألوان وهوية أكاديميتك التي يراها عملاؤك.",
          "Customize your academy's logo, colors, and identity shown to your clients.",
        )}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              {L("بيانات الأكاديمية", "Academy information")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{L("اسم الأكاديمية", "Academy name")}</Label>
              <Input
                value={form.academyName}
                onChange={(e) => set("academyName")(e.target.value)}
                maxLength={80}
              />
            </div>

            <BrandImageField
              label={L("الشعار", "Logo")}
              value={form.logo}
              folder="branding/logo"
              onUploaded={(url) => set("logo")(url)}
            />
            <BrandImageField
              label={L("صورة شاشة الدخول", "Login image")}
              value={form.loginImage}
              folder="branding/login"
              onUploaded={(url) => set("loginImage")(url)}
            />
            <BrandImageField
              label={L("بانر لوحة التحكم", "Dashboard banner")}
              value={form.dashboardImage}
              folder="branding/dashboard"
              onUploaded={(url) => set("dashboardImage")(url)}
            />
            <BrandImageField
              label={L("أيقونة الموقع (Favicon)", "Favicon")}
              value={form.favicon}
              folder="branding/favicon"
              onUploaded={(url) => set("favicon")(url)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              {L("ألوان العلامة التجارية", "Brand colors")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{L(f.ar, f.en)}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(form[f.key] as string) ?? "#000000"}
                    onChange={(e) => set(f.key)(e.target.value as FormState[typeof f.key])}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <Input
                    dir="ltr"
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) => set(f.key)(e.target.value as FormState[typeof f.key])}
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {L("خيارات إضافية", "Branding options")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.showFitxnetBadge}
                onChange={(e) => set("showFitxnetBadge")(e.target.checked)}
              />
              {L('إظهار شارة "بدعم من FITXNET" في الشريط الجانبي', 'Show "Powered by FITXNET" badge in the sidebar')}
            </label>
          </CardContent>
        </Card>

        {msg && (
          <p className={msg.type === "ok" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {msg.text}
          </p>
        )}

        <Separator />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={resetting || saving} onClick={reset}>
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {L("إعادة التعيين للافتراضي", "Reset to defaults")}
          </Button>
          <Button type="button" disabled={saving || resetting} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {L("حفظ الهوية التجارية", "Save branding")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrandImageField({
  label,
  value,
  folder,
  onUploaded,
}: {
  label: string;
  value?: string;
  folder: string;
  onUploaded: (url: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="h-12 w-12 shrink-0 rounded-md border border-input object-cover"
          />
        ) : null}
        <CloudinaryUpload folder={folder} onUploaded={(url) => onUploaded(url)} />
      </div>
    </div>
  );
}
