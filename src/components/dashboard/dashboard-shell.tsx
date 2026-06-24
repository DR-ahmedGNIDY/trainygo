"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
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
import { MobileTabBar } from "./mobile-tab-bar";
import { getNavForRole } from "./nav-config";
import { useI18n } from "@/components/providers/i18n-provider";
import { coachIsReadOnly } from "@/lib/permissions";
import type { AccountStatus, UserRole } from "@/lib/constants";

export function DashboardShell({
  role,
  name,
  subtitle,
  status,
  avatarUrl,
  notifications = [],
  unread = 0,
  children,
}: {
  role: UserRole;
  name: string;
  subtitle?: string;
  status: AccountStatus;
  avatarUrl?: string;
  notifications?: NotificationItem[];
  unread?: number;
  children: React.ReactNode;
}) {
  const { t, dir } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = getNavForRole(role, t);
  const mobileSide = dir === "rtl" ? "right" : "left";
  const showReadOnly = role === "coach" && coachIsReadOnly(status);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-background lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
          <SidebarNav sections={sections} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1.5 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <SheetContent side={mobileSide} className="w-72 p-0">
              <SheetTitle className="sr-only">FITXNET</SheetTitle>
              <div className="flex h-16 items-center border-b px-5">
                <Logo />
              </div>
              <div className="overflow-y-auto py-3">
                <SidebarNav
                  sections={sections}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

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
