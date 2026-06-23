import { requireRole } from "@/lib/auth/session";
import { listFoods } from "@/lib/services/foods";
import { FoodLibrary, type FoodItem } from "@/components/library/food-library";

export const dynamic = "force-dynamic";

export default async function AdminFoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string }>;
}) {
  await requireRole("super_admin");
  const sp = await searchParams;
  const [sortBy, sortDir] = (sp.sort?.split(":") ?? []) as [
    "calories" | "protein" | "carbs" | "fat" | undefined,
    "asc" | "desc" | undefined,
  ];
  const res = await listFoods(
    { role: "super_admin" },
    { query: sp.q, category: sp.category, page: Number(sp.page) || 1, sortBy, sortDir },
  );
  return (
    <FoodLibrary
      role="super_admin"
      items={res.items as unknown as FoodItem[]}
      total={res.total}
      page={res.page}
      pages={res.pages}
      query={sp.q ?? ""}
      category={sp.category ?? "all"}
      sort={sp.sort ?? ""}
      canWrite
    />
  );
}
