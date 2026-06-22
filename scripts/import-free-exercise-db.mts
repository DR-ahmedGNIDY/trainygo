/**
 * Phase 7 (revised) — real exercise import from `free-exercise-db`
 * (https://github.com/yuhonas/free-exercise-db), a fully public-domain
 * (Unlicense) dataset: 873 exercises, 100% with two real start/end-position
 * photos each, clean English names, granular muscle tags. Adopted in place
 * of WGER after auditing media coverage (WGER: only 32% had any image, 0.6%
 * had a true animated GIF — not visually useful for the library).
 *
 * Static JSON + static images on GitHub raw — no API key, no rate limits.
 *
 * Run with:  npx tsx scripts/import-free-exercise-db.mts [--dry-run]
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* rely on real env */ }
}
loadEnv();

const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const JSON_URL = `${RAW_BASE}/dist/exercises.json`;
const IMAGE_BASE = `${RAW_BASE}/exercises`;

interface FedbExercise {
  id: string;
  name: string;
  category: string; // training type: strength/cardio/stretching/plyometrics/strongman/powerlifting/olympic weightlifting
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[]; // relative paths, e.g. "3_4_Sit-Up/0.jpg"
}

const MUSCLE_TAG: Record<string, string> = {
  abdominals: "abs", abductors: "abductors", adductors: "adductors", biceps: "biceps",
  calves: "calves", chest: "chest", forearms: "forearms", glutes: "glutes",
  hamstrings: "hamstrings", lats: "lats", "lower back": "lower_back",
  "middle back": "middle_back", neck: "neck", quadriceps: "quadriceps",
  shoulders: "shoulders", traps: "traps", triceps: "triceps",
};

/** Body-part muscle → our existing ExerciseCategory enum (no schema change). */
const MUSCLE_TO_CATEGORY: Record<string, ExerciseCategory> = {
  chest: "chest",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  lats: "back", "lower back": "back", "middle back": "back", traps: "back",
  abdominals: "abs",
  glutes: "glutes",
  quadriceps: "legs", hamstrings: "legs", calves: "legs", adductors: "legs", abductors: "legs",
  forearms: "full_body", neck: "full_body",
};

function resolveCategory(ex: FedbExercise): ExerciseCategory {
  if (ex.category === "cardio") return "cardio";
  if (ex.category === "stretching") return "stretching";
  const primary = ex.primaryMuscles?.[0];
  if (primary && MUSCLE_TO_CATEGORY[primary]) return MUSCLE_TO_CATEGORY[primary];
  return "full_body";
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      if (w.length === 0) return w;
      if (/^[A-Z0-9/]+$/.test(w)) return w; // keep abbreviations/numbers as-is
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
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

  console.log("Fetching free-exercise-db dataset (static JSON, no API key)...");
  const res = await fetch(JSON_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const raw = (await res.json()) as FedbExercise[];
  console.log(`Fetched ${raw.length} exercises.`);

  const seenName = new Set<string>();
  const seenExternalId = new Set<string>();
  let droppedNoName = 0, droppedDuplicate = 0;
  const normalized: NormalizedExercise[] = [];

  for (const ex of raw) {
    const nameEn = titleCase(ex.name.trim());
    if (!nameEn) { droppedNoName++; continue; }
    const key = nameEn.toLowerCase();
    if (seenName.has(key)) { droppedDuplicate++; continue; }

    const externalId = `freeexercisedb-${ex.id}`;
    if (seenExternalId.has(externalId)) { droppedDuplicate++; continue; }
    seenName.add(key);
    seenExternalId.add(externalId);

    const targetMuscles = [...new Set([...(ex.primaryMuscles ?? []), ...(ex.secondaryMuscles ?? [])].map((m) => MUSCLE_TAG[m] ?? m.replace(/\s+/g, "_")))];
    const category = resolveCategory(ex);
    const nameAr = translateToArabic(nameEn);
    const instructionsEn = (ex.instructions ?? []).join(" ");
    const [imgStart, imgEnd] = ex.images ?? [];

    normalized.push({
      externalId,
      source: "free-exercise-db",
      nameAr,
      nameEn,
      category,
      targetMuscles,
      instructions: instructionsEn ? { en: instructionsEn } : undefined,
      imageUrlStart: imgStart ? `${IMAGE_BASE}/${imgStart}` : undefined,
      imageUrlEnd: imgEnd ? `${IMAGE_BASE}/${imgEnd}` : (imgStart ? `${IMAGE_BASE}/${imgStart}` : undefined),
    });
  }

  console.log(`\nCleaning summary:`);
  console.log(`  dropped (no name):        ${droppedNoName}`);
  console.log(`  dropped (duplicate):      ${droppedDuplicate}`);
  console.log(`  kept (clean, real):       ${normalized.length}`);

  const byCat: Record<string, number> = {};
  const withImages = normalized.filter((n) => n.imageUrlStart).length;
  for (const n of normalized) byCat[n.category] = (byCat[n.category] ?? 0) + 1;
  console.log("\nCategory breakdown:", byCat);
  console.log(`With images: ${withImages}/${normalized.length}`);
  console.log(`Arabic translated (non-fallback): ${normalized.filter((n) => n.nameAr !== n.nameEn).length}/${normalized.length}`);

  if (dryRun) {
    console.log("\nSample items:");
    for (const s of normalized.slice(0, 8)) {
      console.log(`  ${s.nameEn.padEnd(28)} | ${s.nameAr.padEnd(20)} | ${s.category.padEnd(10)} | muscles=${s.targetMuscles.join(",")}`);
      console.log(`    start=${s.imageUrlStart}`);
    }
    console.log("\n--dry-run: skipping database import.");
    process.exit(0);
  }

  const { importExercises } = await import("@/lib/import/exercise-import-service.ts");
  const result = await importExercises(normalized, { source: "free-exercise-db" });
  console.log("\nImport result:", result);

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
