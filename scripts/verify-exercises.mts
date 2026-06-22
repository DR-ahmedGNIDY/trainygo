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
  const { Food } = await import("@/models/Food");
  await connectToDatabase();

  const totalEx = await Exercise.countDocuments({ isSystemExercise: true });
  const totalFood = await Food.countDocuments({ isSystemFood: true });
  console.log("System exercises in DB:", totalEx);
  console.log("System foods in DB:", totalFood);

  const byCat = await Exercise.aggregate([
    { $match: { isSystemExercise: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log("By category:", byCat);

  const sample = await Exercise.find({ isSystemExercise: true }).limit(8).select("nameAr nameEn category targetMuscles").lean();
  console.log("\nSample records:");
  for (const s of sample) console.log(`  ${s.nameEn.padEnd(30)} | ${s.nameAr.padEnd(25)} | ${s.category} | ${s.targetMuscles.join(",")}`);

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
