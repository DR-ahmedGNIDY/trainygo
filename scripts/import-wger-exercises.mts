/**
 * Phase 7 — real exercise import from the WGER public API (free, no key
 * required). Goes through the EXISTING import architecture (fromWger adapter
 * shape, validation layer, importExercises upsert service).
 *
 * ExerciseDB was evaluated and is NOT used: it requires a paid RapidAPI key
 * (verified: 401 Unauthorized without one) and the only free mirror found is
 * gated behind a Vercel bot-check. WGER's full library (859 exercises, no
 * sport-specific categories) is used instead — real data, not generated.
 *
 * Run with:  npx tsx scripts/import-wger-exercises.mts [--dry-run]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { ExerciseCategory } from "@/lib/constants";
import type { NormalizedExercise } from "@/lib/import/types";
import { translateToArabic } from "./import/wger-translate.mts";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* rely on real env */ }
}
loadEnv();

const WGER_BASE = "https://wger.de/api/v2";
const FOREIGN_MARKER = /\b(de|del|con|della|avanti|seduto|para|el|la|las|los|et|une|le|na|sobre|com|inclinado|sentado|barra|mancuernas|polea)\b/i;

interface WgerMuscle { name: string; name_en: string }
interface WgerEquipment { name: string }
interface WgerTranslation { language: number; name: string; description?: string }
interface WgerExerciseInfo {
  uuid: string;
  category: { id: number; name: string } | null;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations: WgerTranslation[];
}

const CATEGORY_MAP: Record<string, ExerciseCategory> = {
  Abs: "abs",
  Back: "back",
  Calves: "legs",
  Cardio: "cardio",
  Chest: "chest",
  Legs: "legs",
  Shoulders: "shoulders",
  // "Arms" is resolved per-exercise below (biceps vs triceps vs forearm)
};

const MUSCLE_MAP: Record<string, string> = {
  Quads: "quadriceps",
  Glutes: "glutes",
  "Obliquus externus abdominis": "obliques",
  Abs: "abs",
  Hamstrings: "hamstrings",
  Chest: "chest",
  Triceps: "triceps",
  Calves: "calves",
  "Serratus anterior": "serratus",
  Trapezius: "traps",
  Biceps: "biceps",
  Lats: "lats",
  Brachialis: "biceps",
  Soleus: "calves",
  Shoulders: "shoulders",
};

function stripHtml(html?: string): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s{2,}/g, " ").trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      if (["of", "the", "and", "to", "a", "an"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\bEz-bar\b/i, "EZ-Bar")
    .replace(/\bSz-bar\b/i, "EZ-Bar")
    .replace(/\bTrx\b/i, "TRX");
}

function resolveCategory(ex: WgerExerciseInfo, allMuscles: string[], nameEn: string): ExerciseCategory {
  const catName = ex.category?.name ?? "";
  if (catName === "Arms") {
    if (allMuscles.includes("Biceps") || allMuscles.includes("Brachialis")) return "biceps";
    if (allMuscles.includes("Triceps")) return "triceps";
    const lower = nameEn.toLowerCase();
    if (/curl/.test(lower)) return "biceps";
    if (/(extension|pushdown|dip|skull|press)/.test(lower)) return "triceps";
    return "full_body"; // wrist/forearm work — no dedicated category in the model
  }
  return CATEGORY_MAP[catName] ?? "full_body";
}

async function fetchAllExercises(): Promise<WgerExerciseInfo[]> {
  const out: WgerExerciseInfo[] = [];
  let url = `${WGER_BASE}/exerciseinfo/?limit=100`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WGER fetch failed: ${res.status}`);
    const json = (await res.json()) as { results: WgerExerciseInfo[]; next: string | null };
    out.push(...json.results);
    url = json.next ?? "";
  }
  return out;
}

/**
 * Some sandboxed networks block outbound UDP DNS-SRV queries from Node (the
 * MongoDB driver's mongodb+srv:// resolution) while OS-level `nslookup` still
 * works. If the normal connection fails on querySrv, shell out to `nslookup`
 * (host-only, no credentials on the command line) to resolve the shard hosts
 * + TXT options, then reconnect with an equivalent direct mongodb:// URI built
 * entirely in memory. Credentials never touch a command line argument.
 */
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

    const extraParams = (query ?? "?").replace(/^\?/, "");
    const params = new URLSearchParams(extraParams);
    params.set("ssl", "true");
    if (!params.has("retryWrites")) params.set("retryWrites", "true");
    if (!params.has("w")) params.set("w", "majority");
    const merged = `${txtOptions}${txtOptions ? "&" : ""}${params.toString()}`;

    return `mongodb://${userinfo}@${hosts.join(",")}/${db}?${merged}`;
  } catch {
    return null;
  }
}

/**
 * IMPORTANT: `@/lib/db` captures `process.env.MONGODB_URI` into a module-level
 * constant the first time it is imported anywhere in the process (including
 * transitively, e.g. via the import service). So this resolution MUST happen
 * — and any env var swap MUST land — before that module's first import,
 * using a raw mongoose connection of our own to test connectivity first.
 */
async function ensureMongoUriResolvable() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.startsWith("mongodb+srv://")) return; // already a direct URI, nothing to do

  const mongoose = (await import("mongoose")).default;
  try {
    const probe = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    await probe.close();
    return; // SRV resolution works fine in this environment
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

  console.log("Fetching real exercise data from WGER (wger.de/api/v2)...");
  const raw = await fetchAllExercises();
  console.log(`Fetched ${raw.length} exercises from WGER.`);

  const seenNames = new Set<string>();
  const seenExternalId = new Set<string>();
  let droppedForeign = 0;
  let droppedNoName = 0;
  let droppedDuplicate = 0;

  const normalized: NormalizedExercise[] = [];

  for (const ex of raw) {
    const translation = ex.translations.find((t) => t.language === 2 && t.name?.trim());
    if (!translation) {
      droppedNoName++;
      continue;
    }
    const rawName = translation.name.trim();
    if (FOREIGN_MARKER.test(rawName)) {
      droppedForeign++;
      continue;
    }
    const nameEn = titleCase(rawName);
    const dedupeKey = nameEn.toLowerCase();
    if (seenNames.has(dedupeKey)) {
      droppedDuplicate++;
      continue;
    }
    seenNames.add(dedupeKey);

    const externalId = `wger-${ex.uuid}`;
    if (seenExternalId.has(externalId)) continue;
    seenExternalId.add(externalId);

    const allMuscleNamesEn = [...ex.muscles, ...ex.muscles_secondary].map((m) => m.name_en || m.name);
    const targetMuscles = [
      ...new Set(allMuscleNamesEn.map((m) => MUSCLE_MAP[m]).filter(Boolean) as string[]),
    ];
    const category = resolveCategory(ex, allMuscleNamesEn, nameEn);
    const nameAr = translateToArabic(nameEn);
    const descriptionEn = stripHtml(translation.description);

    normalized.push({
      externalId,
      source: "wger",
      nameAr,
      nameEn,
      category,
      targetMuscles,
      description: descriptionEn ? { en: descriptionEn } : undefined,
    });
  }

  console.log(`\nCleaning summary:`);
  console.log(`  dropped (no English name):     ${droppedNoName}`);
  console.log(`  dropped (mislabeled foreign):   ${droppedForeign}`);
  console.log(`  dropped (duplicate name):       ${droppedDuplicate}`);
  console.log(`  kept (clean, real exercises):   ${normalized.length}`);

  const byCat: Record<string, number> = {};
  for (const n of normalized) byCat[n.category] = (byCat[n.category] ?? 0) + 1;
  console.log("\nCategory breakdown:", byCat);

  if (dryRun) {
    console.log("\n--dry-run: skipping database import.");
    process.exit(0);
  }

  const { importExercises } = await import("@/lib/import/exercise-import-service.ts");
  const result = await importExercises(normalized, { source: "wger" });
  console.log("\nImport result:", result);

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
