/**
 * Trainygo database seeder.
 *
 * Idempotent: each section seeds only when its data is missing, so it is safe
 * to re-run. Seeds Super Admin, plans, settings, and the starter exercise /
 * food / template libraries. Full datasets (1000+ exercises, 3000+ foods) are
 * imported in Phase 6 via the import adapters.
 *
 * Run with:  npm run seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* rely on real env */
  }
}
loadEnv();

async function main() {
  const { seedAll } = await import("@/lib/seed");
  const mongoose = (await import("mongoose")).default;

  await seedAll(console.log);

  await mongoose.connection.close();
  console.log("\n✅ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
