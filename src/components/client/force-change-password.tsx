"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { changeOwnPasswordAction } from "@/lib/actions/client";

/**
 * Full-screen gate shown instead of the dashboard when the coach has just
 * reset this client's password. The client must set their own password
 * before they can use the system at all.
 */
export function ForceChangePasswordScreen() {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError(L("كلمة المرور 8 أحرف على الأقل", "Password must be at least 8 characters"));
      return;
    }
    if (next !== confirm) {
      setError(L("كلمتا المرور غير متطابقتين", "Passwords don't match"));
      return;
    }
    setSaving(true);
    const res = await changeOwnPasswordAction(current, next);
    setSaving(false);
    if (!res.ok) {
      setError(L("كلمة المرور الحالية غير صحيحة", "Current password is incorrect"));
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle>{L("يجب تعيين كلمة مرور جديدة", "You must set a new password")}</CardTitle>
          <CardDescription>
            {L(
              "قام مدربك بإعادة تعيين كلمة مرورك. أدخل كلمة المرور المؤقتة، ثم اختر كلمة مرور جديدة لمتابعة استخدام النظام.",
              "Your coach reset your password. Enter the temporary password, then choose a new one to continue.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{L("كلمة المرور المؤقتة", "Temporary password")}</Label>
              <Input type="password" dir="ltr" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{L("كلمة المرور الجديدة", "New password")}</Label>
              <Input type="password" dir="ltr" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{L("تأكيد كلمة المرور", "Confirm password")}</Label>
              <Input type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {L("تعيين كلمة المرور والمتابعة", "Set password & continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
