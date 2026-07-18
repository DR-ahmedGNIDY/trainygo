import { requireRole } from "@/lib/auth/session";
import { getOwnActivePlan } from "@/lib/services/client-self";
import { getOwnActiveImagePlan } from "@/lib/services/nutrition-image-plans";
import { getTodayDoneIndices } from "@/lib/services/meal-logs";
import { NutritionView } from "./nutrition-view";
import { NutritionImageView } from "./nutrition-image-view";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPage() {
  const session = await requireRole("client");

  // Two parallel systems: a structured plan and an image plan. The client sees
  // exactly one — whichever the coach set up most recently.
  const [plan, imagePlan] = await Promise.all([
    getOwnActivePlan(session.user.id),
    getOwnActiveImagePlan(session.user.id),
  ]);

  const imageIsNewer =
    imagePlan !== null &&
    (plan === null ||
      new Date(imagePlan.createdAt).getTime() >= new Date(plan.createdAt).getTime());

  if (imageIsNewer) {
    return (
      <NutritionImageView
        plan={{
          id: String(imagePlan!._id),
          name: imagePlan!.nameAr,
          images: (imagePlan!.images ?? []).map((img) => ({ url: img.url })),
          note: imagePlan!.note,
        }}
      />
    );
  }

  const doneToday = plan ? await getTodayDoneIndices(String(plan._id)) : [];

  return (
    <NutritionView
      plan={
        plan
          ? {
              id: String(plan._id),
              name: plan.nameAr,
              meals: plan.meals as never,
              totals: plan.totals as never,
            }
          : null
      }
      doneToday={doneToday}
    />
  );
}
