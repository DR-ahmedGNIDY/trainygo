import Link from "next/link";
import { Lock, Palette, LayoutDashboard, FileText, Users } from "lucide-react";
import { requireCoachArea } from "@/lib/auth/session";
import { canAccessBranding } from "@/lib/permissions/team";
import { getBrandSettings } from "@/lib/services/brand-settings";
import { hasBrandingAccess } from "@/lib/services/feature-access";
import { BrandingForm } from "./branding-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CoachBrandingPage() {
  const ctx = await requireCoachArea(canAccessBranding);
  const hasAccess = await hasBrandingAccess(ctx.coachId);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center shadow-lg">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-10 w-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Branding Available in Professional Plan</h2>
              <p className="text-muted-foreground">
                Upgrade to unlock full white-label customization for your academy.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 text-sm text-start">
              {([
                [Palette, "Academy logo & colors"],
                [LayoutDashboard, "Dashboard & player experience"],
                [FileText, "Branded reports & PDFs"],
                [Users, "Custom identity for clients"],
              ] as [React.ElementType, string][]).map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/coach/subscription">Upgrade Subscription</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brand = await getBrandSettings(ctx.coachId);
  return <BrandingForm initialBrand={brand} />;
}
