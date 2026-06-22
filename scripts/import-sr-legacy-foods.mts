/**
 * Phase 7 — real food import from USDA's SR Legacy dataset, downloaded as a
 * static public-domain JSON file (no API key, no account, no rate limits —
 * https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip).
 * The file is read locally; this script makes NO network calls.
 *
 * Goes straight through the existing Food model with an idempotent upsert
 * (same pattern as the exercise importer) — no schema changes.
 *
 * Run with:  npx tsx scripts/import-sr-legacy-foods.mts [--dry-run]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { FoodCategory } from "@/lib/constants";
import { translateFoodToArabic } from "./import/food-translate.mts";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* rely on real env */ }
}
loadEnv();

const DATASET_PATH = resolve(process.cwd(), ".usda_sr_extracted/FoodData_Central_sr_legacy_food_json_2021-10-28.json");

interface SrNutrient { nutrient: { number: string; name: string }; amount?: number }
interface SrFood { description: string; foodCategory?: { description: string }; foodNutrients: SrNutrient[] }

/** SR Legacy category → our existing FoodCategory enum, plus a per-category cap
 * so the final library stays balanced rather than dominated by meat cuts. */
const CATEGORY_MAP: Record<string, { cat: FoodCategory; cap: number }> = {
  "Vegetables and Vegetable Products": { cat: "vegetables", cap: 85 },
  "Fruits and Fruit Juices": { cat: "fruits", cap: 65 },
  "Beef Products": { cat: "protein", cap: 28 },
  "Poultry Products": { cat: "protein", cap: 28 },
  "Pork Products": { cat: "protein", cap: 14 },
  "Lamb, Veal, and Game Products": { cat: "protein", cap: 10 },
  "Finfish and Shellfish Products": { cat: "protein", cap: 25 },
  "Dairy and Egg Products": { cat: "protein", cap: 25 },
  "Legumes and Legume Products": { cat: "protein", cap: 20 },
  "Sausages and Luncheon Meats": { cat: "protein", cap: 8 },
  "Fats and Oils": { cat: "healthy_fats", cap: 30 },
  "Nut and Seed Products": { cat: "healthy_fats", cap: 35 },
  Beverages: { cat: "drinks", cap: 40 },
  "Cereal Grains and Pasta": { cat: "carbs", cap: 40 },
  "Breakfast Cereals": { cat: "carbs", cap: 20 },
  "Fast Foods": { cat: "fast_food", cap: 35 },
  "Restaurant Foods": { cat: "fast_food", cap: 15 },
};

/** Skipped wholesale: Baby Foods, American Indian/Alaska Native Foods (niche),
 * Sweets / Soups Sauces and Gravies / Meals Entrees and Side Dishes / Spices
 * and Herbs / Snacks / Baked Products (mostly candy, sauces, mixed dishes, or
 * brand-heavy — lower quality fit for a coaching macro library). */

const BRAND_BLOCKLIST = [
  "pillsbury", "kraft", "quaker", "campbell", "general mills", "kellogg", "post ", "nabisco",
  "heinz", "hellmann", "land o lakes", "tyson", "hormel", "oscar mayer", "jimmy dean", "eggo",
  "betty crocker", "pepperidge farm", "sara lee", "stouffer", "lipton", "swanson", "ore ida",
  "mccormick", "usda commodity", "formulated", "fortified",
];

const CURATED: { nameEn: string; category: FoodCategory; calories: number; protein: number; carbs: number; fat: number; fiber: number }[] = [
  { nameEn: "Whey Protein Powder", category: "supplements", calories: 400, protein: 80, carbs: 8, fat: 6, fiber: 0 },
  { nameEn: "Casein Protein Powder", category: "supplements", calories: 376, protein: 72, carbs: 12, fat: 4, fiber: 0 },
  { nameEn: "Mass Gainer Powder", category: "supplements", calories: 410, protein: 25, carbs: 70, fat: 4, fiber: 2 },
  { nameEn: "BCAA Powder", category: "supplements", calories: 8, protein: 2, carbs: 0, fat: 0, fiber: 0 },
  { nameEn: "Creatine Monohydrate", category: "supplements", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { nameEn: "Protein Bar, Chocolate", category: "supplements", calories: 360, protein: 30, carbs: 33, fat: 12, fiber: 9 },
  { nameEn: "Pre-Workout Powder", category: "supplements", calories: 13, protein: 0, carbs: 3, fat: 0, fiber: 0 },
  { nameEn: "Multivitamin Gummies", category: "supplements", calories: 240, protein: 0, carbs: 60, fat: 0, fiber: 0 },
  { nameEn: "Fish Oil Softgel", category: "supplements", calories: 540, protein: 0, carbs: 0, fat: 60, fiber: 0 },
  { nameEn: "Electrolyte Powder", category: "supplements", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
];

function titleCase(s: string): string {
  return s.split(/\s+/).map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

function cleanDescription(desc: string): string | null {
  const lower = desc.toLowerCase();
  if (BRAND_BLOCKLIST.some((b) => lower.includes(b))) return null;
  if (/\d/.test(desc)) return null; // product codes / UPC-style entries

  // "Restaurant, <cuisine>, <dish>, ..." → "<dish> (<cuisine>)"
  const restMatch = desc.match(/^Restaurant,\s*([^,]+),\s*([^,]+)/i);
  let base: string;
  if (restMatch) {
    base = `${restMatch[2].trim()} (${restMatch[1].trim()})`;
  } else {
    base = desc.split(",").slice(0, 3).join(",").trim();
  }

  // Drop a trailing unbalanced "(" fragment (truncated parenthetical detail).
  const openCount = (base.match(/\(/g) || []).length;
  const closeCount = (base.match(/\)/g) || []).length;
  if (openCount > closeCount) base = base.slice(0, base.lastIndexOf("(")).trim();

  base = base.replace(/\s{2,}/g, " ").trim();
  if (base.length > 50 || base.length < 3) return null;
  return titleCase(base);
}

function macroFrom(nutrients: SrNutrient[]) {
  const get = (num: string) => nutrients.find((n) => n.nutrient?.number === num)?.amount ?? 0;
  return {
    calories: Math.round(get("208")),
    protein: Math.round(get("203") * 10) / 10,
    carbs: Math.round(get("205") * 10) / 10,
    fat: Math.round(get("204") * 10) / 10,
    fiber: Math.round(get("291") * 10) / 10,
  };
}

function resolveDirectUriFallback(srvUri: string): string | null {
  const m = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/);
  if (!m) return null;
  const [, userinfo, host, db, query] = m;
  try {
    const srvOut = execFileSync("nslookup", ["-type=SRV", `_mongodb._tcp.${host}`], { encoding: "utf-8" });
    const hosts = [...srvOut.matchAll(/svr hostname\s*=\s*(\S+)/g)].map((x) => `${x[1]}:27017`);
    if (hosts.length === 0) return null;
    const txtOut = execFileSync("nslookup", ["-type=TXT", host], { encoding: "utf-8" });
    const txtMatch = txtOut.match(/"([^"]+)"/);
    const txtOptions = txtMatch ? txtMatch[1] : "";
    const params = new URLSearchParams((query ?? "?").replace(/^\?/, ""));
    params.set("ssl", "true");
    if (!params.has("retryWrites")) params.set("retryWrites", "true");
    if (!params.has("w")) params.set("w", "majority");
    const merged = `${txtOptions}${txtOptions ? "&" : ""}${params.toString()}`;
    return `mongodb://${userinfo}@${hosts.join(",")}/${db}?${merged}`;
  } catch {
    return null;
  }
}

async function ensureMongoUriResolvable() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.startsWith("mongodb+srv://")) return;
  const mongoose = (await import("mongoose")).default;
  try {
    const probe = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    await probe.close();
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("querySrv")) throw err;
    console.log("\nmongodb+srv:// DNS lookup blocked in this environment — resolving a direct connection via nslookup...");
    const direct = resolveDirectUriFallback(uri);
    if (!direct) throw err;
    process.env.MONGODB_URI = direct;
    console.log("Resolved a direct (non-SRV) connection URI.");
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun) await ensureMongoUriResolvable();

  console.log("Reading local SR Legacy dataset (offline, no network calls)...");
  const raw = JSON.parse(readFileSync(DATASET_PATH, "utf-8")) as { SRLegacyFoods: SrFood[] };
  const allFoods = raw.SRLegacyFoods;
  console.log(`Loaded ${allFoods.length} total SR Legacy records.`);

  type Candidate = { nameEn: string; category: FoodCategory; calories: number; protein: number; carbs: number; fat: number; fiber: number };
  const buckets: Record<string, Candidate[]> = {};
  const seen = new Set<string>();
  let droppedUnmapped = 0, droppedBrandOrLong = 0, droppedDuplicate = 0, droppedNoMacros = 0;

  // Pass 1 — collect every valid candidate per USDA source category (no cap yet).
  for (const food of allFoods) {
    const catName = food.foodCategory?.description ?? "";
    const mapping = CATEGORY_MAP[catName];
    if (!mapping) { droppedUnmapped++; continue; }

    const nameEn = cleanDescription(food.description);
    if (!nameEn) { droppedBrandOrLong++; continue; }

    const key = nameEn.toLowerCase();
    if (seen.has(key)) { droppedDuplicate++; continue; }

    const macro = macroFrom(food.foodNutrients);
    if (macro.calories === 0 && macro.protein === 0 && macro.carbs === 0 && macro.fat === 0) {
      droppedNoMacros++;
      continue;
    }

    seen.add(key);
    // Route plain juices into "drinks" even though SR Legacy files them under
    // "Fruits and Fruit Juices" — more useful classification for a meal plan.
    const category: FoodCategory = /juice/i.test(nameEn) ? "drinks" : mapping.cat;
    (buckets[catName] ??= []).push({ nameEn, category, ...macro });
  }

  // Pass 2 — rank each USDA source category by name simplicity (shorter,
  // plainer names are more likely to be the recognizable staples coaches
  // want) and keep only the top N up to that category's cap.
  let droppedCap = 0;
  const items: { nameEn: string; nameAr: string; category: FoodCategory; calories: number; protein: number; carbs: number; fat: number; fiber: number }[] = [];
  for (const [catName, mapping] of Object.entries(CATEGORY_MAP)) {
    const candidates = (buckets[catName] ?? []).sort((a, b) => a.nameEn.length - b.nameEn.length);
    const kept = candidates.slice(0, mapping.cap);
    droppedCap += Math.max(0, candidates.length - kept.length);
    for (const c of kept) items.push({ ...c, nameAr: translateFoodToArabic(c.nameEn) });
  }

  for (const c of CURATED) {
    const key = c.nameEn.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ ...c, nameAr: translateFoodToArabic(c.nameEn) });
  }

  console.log(`\nCleaning summary:`);
  console.log(`  dropped (category not mapped):  ${droppedUnmapped}`);
  console.log(`  dropped (brand-like / too long): ${droppedBrandOrLong}`);
  console.log(`  dropped (duplicate name):        ${droppedDuplicate}`);
  console.log(`  dropped (no macro data):         ${droppedNoMacros}`);
  console.log(`  dropped (category cap reached):  ${droppedCap}`);
  console.log(`  kept (clean, real foods):        ${items.length}`);

  const byCat: Record<string, number> = {};
  for (const i of items) byCat[i.category] = (byCat[i.category] ?? 0) + 1;
  console.log("\nCategory breakdown:", byCat);

  const arTranslated = items.filter((i) => i.nameAr !== i.nameEn).length;
  console.log(`Arabic names translated: ${arTranslated}/${items.length}`);

  if (dryRun) {
    console.log("\nSample items:");
    for (const s of items.slice(0, 12)) console.log(`  ${s.nameEn.padEnd(28)} | ${s.nameAr.padEnd(20)} | ${s.category} | ${s.calories}kcal P${s.protein} C${s.carbs} F${s.fat}`);
    console.log("\n--dry-run: skipping database import.");
    process.exit(0);
  }

  const { connectToDatabase } = await import("@/lib/db");
  const { Food } = await import("@/models/Food");
  await connectToDatabase();

  let created = 0;
  let updated = 0;
  for (const item of items) {
    const res = await Food.updateOne(
      { nameEn: item.nameEn, isSystemFood: true },
      {
        $set: {
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          category: item.category,
          unit: "100g",
          unitGrams: 100,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          isSystemFood: true,
          createdByCoach: null,
        },
      },
      { upsert: true },
    );
    if (res.upsertedCount) created++;
    else if (res.modifiedCount) updated++;
  }

  console.log(`\nImport result: created=${created} updated=${updated} total=${items.length}`);

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
