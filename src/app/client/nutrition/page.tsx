import { requireRole } from "@/lib/auth/session";
import { getOwnActivePlan } from "@/lib/services/client-self";
import { NutritionView } from "./nutrition-view";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPage() {
  const session = await requireRole("client");
  const plan = await getOwnActivePlan(session.user.id);

  return (
    <NutritionView
      plan={
        plan
          ? {
              name: plan.nameAr,
              meals: plan.meals as never,
              totals: plan.totals as never,
            }
          : null
      }
    />
  );
}
