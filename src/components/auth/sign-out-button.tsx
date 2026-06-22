"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export function SignOutButton({
  variant = "outline",
}: {
  variant?: "outline" | "ghost" | "default";
}) {
  const { t } = useI18n();
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => signOut({ redirectTo: "/" })}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {t.logout}
    </Button>
  );
}
