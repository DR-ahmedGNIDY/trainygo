/**
 * Verifies migrate-goals.ts logic end-to-end against an in-memory MongoDB
 * seeded with realistic legacy goal values, since the production Atlas
 * cluster is not reachable from this sandbox (no network egress).
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { execSync } from "node:child_process";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { console.log(`${cond ? "✓" : "✗"} ${name}`); cond ? pass++ : fail++; };

async function main() {
  const mem = await MongoMemoryServer.create({
    instance: { storageEngine: "ephemeralForTest", dbPath: ".tmp-mongo-migrate" },
  });
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "trainygo_test_migrate";

  const { connectToDatabase } = await import("@/lib/db");
  const { WorkoutTemplate } = await import("@/models/WorkoutTemplate");
  const { ClientProgram } = await import("@/models/ClientProgram");
  const { User } = await import("@/models/User");
  const { hashPassword } = await import("@/lib/auth/password");

  await connectToDatabase();
  await User.init();

  const coach = await User.create({
    name: "Coach", username: "migcoach", email: "migcoach@t.com",
    passwordHash: await hashPassword("x"), role: "coach", status: "active", coachProfile: { maxClients: 0 },
  });
  const client = await User.create({
    name: "Client", username: "migclient", email: "migclient@t.com",
    passwordHash: await hashPassword("x"), role: "client", status: "active",
    clientProfile: { coach: coach._id },
  });
  // Mongoose's own enum validator would reject "general_fitness" on save —
  // exactly the bug this migration fixes — so write the legacy value via the
  // raw driver, bypassing schema validation, to simulate pre-existing data.
  await User.collection.updateOne({ _id: client._id }, { $set: { "clientProfile.goal": "general_fitness" } });

  // Seed legacy + valid docs directly (bypassing the app's normalizeGoal call
  // sites on purpose, to simulate pre-existing bad data from before this fix).
  await WorkoutTemplate.collection.insertMany([
    { nameAr: "ق1", nameEn: "T1", goal: "general_fitness", weeks: [], isSystemTemplate: true, createdByCoach: null, createdAt: new Date(), updatedAt: new Date() },
    { nameAr: "ق2", nameEn: "T2", goal: "general_fitness", weeks: [], isSystemTemplate: true, createdByCoach: null, createdAt: new Date(), updatedAt: new Date() },
    { nameAr: "ق3", nameEn: "T3", goal: "performance", weeks: [], isSystemTemplate: true, createdByCoach: null, createdAt: new Date(), updatedAt: new Date() },
    { nameAr: "ق4", nameEn: "T4", goal: "muscle_building", weeks: [], isSystemTemplate: true, createdByCoach: null, createdAt: new Date(), updatedAt: new Date() }, // already valid
  ]);
  await ClientProgram.collection.insertMany([
    { client: client._id, coach: coach._id, nameAr: "ب1", nameEn: "P1", goal: "fat_loss", weeks: [], status: "active", createdAt: new Date(), updatedAt: new Date() }, // already valid
    { client: client._id, coach: coach._id, nameAr: "ب2", nameEn: "P2", goal: "sport_performance", weeks: [], status: "active", createdAt: new Date(), updatedAt: new Date() }, // legacy
  ]);

  const beforeTemplates = await WorkoutTemplate.countDocuments({ goal: "general_fitness" });
  const beforePrograms = await ClientProgram.countDocuments({ goal: "fat_loss" });
  check(`seeded 2 WorkoutTemplate docs with general_fitness (found ${beforeTemplates})`, beforeTemplates === 2);
  check(`seeded 1 ClientProgram doc with already-valid fat_loss (found ${beforePrograms})`, beforePrograms === 1);

  // ---- Run the real migration script against this in-memory DB ----
  const dryRunOutput = execSync(`npx tsx scripts/migrate-goals.ts`, {
    env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI, MONGODB_DB: process.env.MONGODB_DB },
    encoding: "utf-8",
  });
  check("dry run reports legacy WorkoutTemplate docs without writing", dryRunOutput.includes("WorkoutTemplate (goal): 4 document(s) with a goal set, 1 already valid, 3 legacy"));
  check("dry run did NOT modify data (still 2 general_fitness)", (await WorkoutTemplate.countDocuments({ goal: "general_fitness" })) === 2);

  const applyOutput = execSync(`npx tsx scripts/migrate-goals.ts --apply`, {
    env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI, MONGODB_DB: process.env.MONGODB_DB },
    encoding: "utf-8",
  });
  console.log("\n--- migrate-goals.ts --apply output ---\n" + applyOutput);

  const afterTemplatesLegacy = await WorkoutTemplate.countDocuments({ goal: "general_fitness" });
  const afterTemplatesValid = await WorkoutTemplate.countDocuments({ goal: { $in: ["muscle_building", "fat_loss", "athletic_conditioning"] } });
  check("after --apply: 0 WorkoutTemplate docs left with general_fitness", afterTemplatesLegacy === 0);
  check(`after --apply: all 4 WorkoutTemplate docs now have a valid goal (got ${afterTemplatesValid})`, afterTemplatesValid === 4);

  const migratedT1 = await WorkoutTemplate.findOne({ nameEn: "T1" }).lean();
  const migratedT3 = await WorkoutTemplate.findOne({ nameEn: "T3" }).lean();
  check(`general_fitness → muscle_building (got "${migratedT1?.goal}")`, migratedT1?.goal === "muscle_building");
  check(`performance → athletic_conditioning (got "${migratedT3?.goal}")`, migratedT3?.goal === "athletic_conditioning");

  const migratedP2 = await ClientProgram.findOne({ nameEn: "P2" }).lean();
  check(`sport_performance → athletic_conditioning (got "${migratedP2?.goal}")`, migratedP2?.goal === "athletic_conditioning");
  const untouchedP1 = await ClientProgram.findOne({ nameEn: "P1" }).lean();
  check(`already-valid fat_loss left untouched (got "${untouchedP1?.goal}")`, untouchedP1?.goal === "fat_loss");

  const migratedClient = await User.findById(client._id).lean();
  check(`User.clientProfile.goal general_fitness → muscle_building (got "${migratedClient?.clientProfile?.goal}")`, migratedClient?.clientProfile?.goal === "muscle_building");

  // Re-running with --apply should be a no-op now (idempotent).
  const secondApply = execSync(`npx tsx scripts/migrate-goals.ts --apply`, {
    env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI, MONGODB_DB: process.env.MONGODB_DB },
    encoding: "utf-8",
  });
  check("second --apply run is idempotent (0 legacy left)", secondApply.includes("Total records updated: 0"));

  console.log(`\n${pass} passed, ${fail} failed`);
  await mem.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
