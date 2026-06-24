"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav-config";
import { cn } from "@/lib/utils";

/** Horizontal, swipeable tab bar shown on mobile only (hidden lg+) for the client section. */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="scrollbar-thin overflow-x-auto border-b bg-background lg:hidden">
      <div className="flex min-w-max gap-1 px-2 py-1.5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
