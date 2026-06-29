"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  coachRegisterSchema,
  type CoachRegisterInput,
} from "@/lib/validations/auth";
import { registerCoach } from "@/lib/actions/auth";
import { ARAB_COUNTRIES } from "@/lib/constants";

export function RegisterForm() {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>(ARAB_COUNTRIES[0].value);
  const [nationalPhone, setNationalPhone] = useState("");
  const dialCode = ARAB_COUNTRIES.find((c) => c.value === country)?.dialCode ?? "+20";

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CoachRegisterInput>({
    resolver: zodResolver(coachRegisterSchema),
    defaultValues: {
      name: "",
      brandName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    setValue("phone", `${dialCode}${nationalPhone}`, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialCode, nationalPhone]);

  async function onSubmit(values: CoachRegisterInput) {
    setServerError(null);
    const res = await registerCoach(values);

    if (!res.ok) {
      if (res.error === "USERNAME_TAKEN") {
        setError("username", { message: t.auth.usernameTaken });
      } else if (res.error === "EMAIL_TAKEN") {
        setError("email", { message: t.auth.emailTaken });
      } else {
        setServerError(t.common.errorDescription);
      }
      return;
    }

    // Auto sign-in after successful registration.
    const signInRes = await signIn("credentials", {
      redirect: false,
      identifier: values.username,
      password: values.password,
    });
    if (!signInRes || signInRes.error) {
      router.push("/login");
      return;
    }
    router.push("/coach");
    router.refresh();
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">{t.auth.registerTitle}</CardTitle>
        <CardDescription>{t.auth.registerSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{t.auth.fullName}</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandName">
              {t.auth.brandName}{" "}
              <span className="text-xs text-muted-foreground">
                ({t.common.optional})
              </span>
            </Label>
            <Input
              id="brandName"
              autoComplete="organization"
              {...register("brandName")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">{t.common.username}</Label>
              <Input
                id="username"
                dir="ltr"
                autoComplete="username"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{L("الدولة", "Country")}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARAB_COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.flag} {L(c.ar, c.en)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t.common.phone}</Label>
            <input type="hidden" {...register("phone")} />
            <div className="flex gap-2">
              <Input dir="ltr" value={dialCode} readOnly disabled className="w-24 shrink-0 text-center" />
              <Input
                id="phone"
                dir="ltr"
                autoComplete="tel"
                value={nationalPhone}
                onChange={(e) => setNationalPhone(e.target.value)}
                className="flex-1"
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t.common.email}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{t.common.password}</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.auth.registerButton}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.auth.haveAccount}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t.auth.signIn}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
