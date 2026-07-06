"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Dumbbell,
  Apple,
  LineChart,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";

export function Landing() {
  const { t, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const [videoFailed, setVideoFailed] = useState(false);

  const features = [
    { icon: Users, title: t.landing.features.clientsTitle, desc: t.landing.features.clientsDesc },
    { icon: Dumbbell, title: t.landing.features.workoutsTitle, desc: t.landing.features.workoutsDesc },
    { icon: Apple, title: t.landing.features.nutritionTitle, desc: t.landing.features.nutritionDesc },
    { icon: LineChart, title: t.landing.features.progressTitle, desc: t.landing.features.progressDesc },
    { icon: ClipboardCheck, title: t.landing.features.checkinsTitle, desc: t.landing.features.checkinsDesc },
    { icon: MessageSquare, title: t.landing.features.messagingTitle, desc: t.landing.features.messagingDesc },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[520px] overflow-hidden">
        {!videoFailed ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 z-0 h-full w-full object-cover"
          >
            <source src="/banar.mp4" type="video/mp4" />
          </video>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.45)" }} aria-hidden />
        <div className="container relative z-10 flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-sm text-zinc-900 dark:text-muted-foreground"
          >
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t.landing.trialNote}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-4xl text-balance text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] dark:text-foreground dark:drop-shadow-none md:text-6xl"
          >
            {t.landing.heroTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-pretty text-lg text-zinc-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] dark:text-muted-foreground dark:drop-shadow-none"
          >
            {t.landing.heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                {t.landing.ctaStart}
                <Arrow className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{t.landing.ctaLogin}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/20 py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t.landing.featuresTitle}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t.landing.featuresSubtitle}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl border bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
            <h2 className="text-3xl font-bold md:text-4xl">
              {t.landing.ctaSectionTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              {t.landing.ctaSectionSubtitle}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link href="/register">
                  {t.landing.ctaStart}
                  <Arrow className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
