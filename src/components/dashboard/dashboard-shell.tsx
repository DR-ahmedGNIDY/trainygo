"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, AlertTriangle } from "lucide-react";
import { BrandText } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/brand/language-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { NotificationsMenu, type NotificationItem } from "./notifications-menu";
import { PushRegistrar } from "@/components/notifications/push-registrar";
import { MobileTabBar } from "./mobile-tab-bar";
import { getNavForRole } from "./nav-config";
import { useI18n } from "@/components/providers/i18n-provider";
import { useBrand } from "@/components/providers/brand-provider";
import { coachIsReadOnly } from "@/lib/permissions";
import type { AccountStatus, UserRole } from "@/lib/constants";
import type { TeamPermissionContext } from "@/lib/permissions/team";

/** Brand-aware sidebar/sheet logo: shows the coach's custom logo + academy name when configured, else the default FITXNET wordmark. */
function BrandLogo() {
  const brand = useBrand();
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label={brand.academyName}>
      {brand.logo ? (
        <Image src={brand.logo} alt={brand.academyName} width={36} height={36} className="shrink-0 rounded object-contain" />
      ) : (
        <Image src="/favicon.png" alt={brand.academyName} width={36} height={36} className="shrink-0" priority />
      )}
      {brand.logo ? (
        <span className="text-lg font-bold tracking-tight">{brand.academyName}</span>
      ) : (
        <BrandText className="text-lg" />
      )}
    </Link>
  );
}

export function DashboardShell({
  role,
  name,
  subtitle,
  status,
  avatarUrl,
  notifications = [],
  unread = 0,
  featureFlags,
  children,
}: {
  role: UserRole;
  name: string;
  subtitle?: string;
  status: AccountStatus;
  avatarUrl?: string;
  notifications?: NotificationItem[];
  unread?: number;
  featureFlags?: { branding?: boolean; teamCtx?: TeamPermissionContext };
  children: React.ReactNode;
}) {
  const { t, dir, locale } = useI18n();
  const brand = useBrand();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = getNavForRole(role, t, featureFlags);
  const mobileSide = dir === "rtl" ? "right" : "left";
  const showReadOnly = (role === "coach" || role === "team_member") && coachIsReadOnly(status);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-[var(--sidebar)] lg:flex"
        style={{ colorScheme: "dark" }}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <BrandLogo />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
          <SidebarNav sections={sections} />
        </div>
        {brand.showFitxnetBadge && (
          <div className="border-t border-white/10 px-5 py-3 text-center text-xs text-white/50">
            {locale === "ar" ? "بدعم من FITXNET" : "Powered by FITXNET"}
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1.5 border-b bg-[var(--header)]/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--header)]/60">
          {/* Mobile nav trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={mobileSide} className="flex w-72 flex-col gap-0 p-0">
              <SheetTitle className="sr-only">{brand.academyName}</SheetTitle>
              <div className="flex h-16 shrink-0 items-center border-b px-5">
                <BrandLogo />
              </div>
              {/* min-h-0 lets this shrink below its content height so overflow-y-auto engages. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
                <SidebarNav
                  sections={sections}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              {brand.showFitxnetBadge && (
                <div className="shrink-0 border-t px-5 py-3 text-center text-xs text-muted-foreground">
                  {locale === "ar" ? "بدعم من FITXNET" : "Powered by FITXNET"}
                </div>
              )}
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <PushRegistrar />
          <NotificationsMenu items={notifications} unread={unread} />
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="ms-1">
            <UserMenu
              name={name}
              subtitle={subtitle}
              role={role}
              avatarUrl={avatarUrl}
            />
          </div>
        </header>

        {role === "client" && <MobileTabBar items={sections[0]?.items ?? []} />}

        {showReadOnly && (
          <div className="flex flex-wrap items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm md:px-6">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span className="flex-1 text-foreground/90">
              {t.dashboard.ui.readOnlyBanner}
            </span>
            <Button asChild size="sm" variant="default">
              <Link href="/coach/subscription">{t.account.upgradeNow}</Link>
            </Button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
