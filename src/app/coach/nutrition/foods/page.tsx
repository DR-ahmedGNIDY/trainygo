import { requireCoachArea } from "@/lib/auth/session";
import { canAccessFoods } from "@/lib/permissions/team";
import { coachCanWrite } from "@/lib/permissions";
import { listFoods, getFoodOverrides } from "@/lib/services/foods";
import { FoodLibrary, type FoodItem } from "@/components/library/food-library";
import { DEFAULT_FOOD_MEALS, DEFAULT_FOOD_PRIORITY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CoachFoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string }>;
}) {
  const ctx = await requireCoachArea(canAccessFoods);
  const sp = await searchParams;
  const [sortBy, sortDir] = (sp.sort?.split(":") ?? []) as [
    "calories" | "protein" | "carbs" | "fat" | undefined,
    "asc" | "desc" | undefined,
  ];
  const res = await listFoods(
    { role: "coach", coachId: ctx.coachId },
    { query: sp.q, category: sp.category, page: Number(sp.page) || 1, sortBy, sortDir },
  );

  // Merge this coach's personal overrides on top of each food's base values, so
  // the library shows (and edits) exactly what the generator uses. Priority and
  // meals are overridden independently — one can be custom while the other is
  // still the library default.
  const baseItems = res.items as unknown as FoodItem[];
  const overrides = await getFoodOverrides(
    ctx.coachId,
    baseItems.map((f) => f._id),
  );
  const items: FoodItem[] = baseItems.map((f) => {
    const o = overrides.get(f._id);
    return {
      ...f,
      priority: o?.priority ?? f.priority ?? DEFAULT_FOOD_PRIORITY,
      priorityOverridden: o?.priority !== undefined,
      meals: o?.meals ?? f.meals ?? [...DEFAULT_FOOD_MEALS],
      mealsOverridden: o?.meals !== undefined,
    };
  });

  return (
    <FoodLibrary
      role="coach"
      items={items}
      total={res.total}
      page={res.page}
      pages={res.pages}
      query={sp.q ?? ""}
      category={sp.category ?? "all"}
      sort={sp.sort ?? ""}
      canWrite={coachCanWrite(ctx.status)}
    />
  );
}
