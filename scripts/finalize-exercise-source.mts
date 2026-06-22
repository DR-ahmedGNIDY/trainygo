/**
 * Verifies the free-exercise-db import, then deletes all WGER-sourced
 * exercises so free-exercise-db is the sole exercise library source.
 * Run with: npx tsx scripts/finalize-exercise-source.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of file.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

async function ensureResolvable() {
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
    const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/);
    if (!m) throw err;
    const [, userinfo, host, db, query] = m;
    const srvOut = execFileSync("nslookup", ["-type=SRV", `_mongodb._tcp.${host}`], { encoding: "utf-8" });
    const hosts = [...srvOut.matchAll(/svr hostname\s*=\s*(\S+)/g)].map((x) => `${x[1]}:27017`);
    const txtOut = execFileSync("nslookup", ["-type=TXT", host], { encoding: "utf-8" });
    const txtMatch = txtOut.match(/"([^"]+)"/);
    const txtOptions = txtMatch ? txtMatch[1] : "";
    const params = new URLSearchParams((query ?? "?").replace(/^\?/, ""));
    params.set("ssl", "true");
    process.env.MONGODB_URI = `mongodb://${userinfo}@${hosts.join(",")}/${db}?${txtOptions}&${params.toString()}`;
  }
}

async function main() {
  await ensureResolvable();
  const { connectToDatabase } = await import("@/lib/db");
  const { Exercise } = await import("@/models/Exercise");
  await connectToDatabase();

  const fedbTotal = await Exercise.countDocuments({ importSource: "free-exercise-db" });
  const fedbWithImages = await Exercise.countDocuments({ importSource: "free-exercise-db", imageUrlStart: { $exists: true, $ne: "" } });
  const wgerTotal = await Exercise.countDocuments({ importSource: "wger" });

  console.log("=== Pre-deletion verification ===");
  console.log("free-exercise-db exercises:", fedbTotal);
  console.log("free-exercise-db with images:", fedbWithImages);
  console.log("WGER exercises (about to delete):", wgerTotal);

  const sample = await Exercise.findOne({ importSource: "free-exercise-db" }).lean();
  console.log("\n=== Sample record ===");
  console.log(JSON.stringify(sample, null, 2));

  if (fedbTotal === 0 || fedbWithImages === 0) {
    console.error("\nABORTING: free-exercise-db import looks empty or missing images — not deleting WGER data.");
    process.exit(1);
  }

  const del = await Exercise.deleteMany({ importSource: "wger" });
  const wgerRemaining = await Exercise.countDocuments({ importSource: "wger" });
  const totalSystemExercises = await Exercise.countDocuments({ isSystemExercise: true });

  console.log("\n=== WGER deletion ===");
  console.log("Deleted:", del.deletedCount);
  console.log("WGER remaining (should be 0):", wgerRemaining);
  console.log("Total system exercises now:", totalSystemExercises);

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
