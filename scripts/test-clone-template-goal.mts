/**
 * Verifies the cloneWorkoutTemplate() fix: cloning a template whose `goal`
 * still holds a legacy value ("general_fitness", written via the raw driver
 * to simulate real pre-existing data, since Mongoose's own enum validator
 * rejects writing it through the model) must succeed and produce a clone
 * with a normalized, valid goal — instead of throwing a Mongoose validation
 * error at WorkoutTemplate.create().
 */
import { MongoMemoryServer } from "mongodb-memory-server";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { console.log(`${cond ? "✓" : "✗"} ${name}`); cond ? pass++ : fail++; };

async function main() {
  const mem = await MongoMemoryServer.create({
    instance: { storageEngine: "ephemeralForTest", dbPath: ".tmp-mongo-clone" },
  });
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "trainygo_test_clone";

  const { connectToDatabase } = await import("@/lib/db");
  const { WorkoutTemplate } = await import("@/models/WorkoutTemplate");
  const { User } = await import("@/models/User");
  const { hashPassword } = await import("@/lib/auth/password");
  const wt = await import("@/lib/services/workout-templates");

  await connectToDatabase();
  await User.init();

  const coach = await User.create({
    name: "Coach Clone Test", username: "clonecoach", email: "clonecoach@t.com",
    passwordHash: await hashPassword("x"), role: "coach", status: "active", coachProfile: { maxClients: 0 },
  });

  // Simulate a real pre-existing legacy system template (bypassing Mongoose
  // validation via the raw driver, exactly as production data would exist
  // from before CLIENT_GOALS was last revised).
  const insertRes = await WorkoutTemplate.collection.insertOne({
    nameAr: "بوش بول ليجز قديم", nameEn: "Old PPL", goal: "general_fitness",
    weeks: [{ weekNumber: 1, name: { ar: "1", en: "1" }, days: [] }],
    isSystemTemplate: true, createdByCoach: null,
    createdAt: new Date(), updatedAt: new Date(),
  });
  const legacyTemplateId = insertRes.insertedId.toString();

  const beforeLegacyDoc = await WorkoutTemplate.findById(legacyTemplateId).lean();
  check(`seeded legacy template has goal="general_fitness" (got "${beforeLegacyDoc?.goal}")`, beforeLegacyDoc?.goal === "general_fitness");

  // ---- The actual regression: clone a template with a legacy goal ----
  let newId: string | null = null;
  let threw: unknown = null;
  try {
    newId = await wt.cloneWorkoutTemplate(legacyTemplateId, { role: "coach", coachId: coach._id.toString() });
  } catch (e) {
    threw = e;
  }

  check("cloneWorkoutTemplate() did NOT throw a Mongoose validation error", threw === null);
  check("cloneWorkoutTemplate() returned a new template id", typeof newId === "string" && newId.length > 0);

  if (newId) {
    const cloned = await WorkoutTemplate.findById(newId).lean();
    check(`cloned template's goal was normalized to a valid value (got "${cloned?.goal}")`, cloned?.goal === "muscle_building");
    check("cloned template is privately owned by the cloning coach", String(cloned?.createdByCoach) === coach._id.toString());
    check("cloned template is not marked as system", cloned?.isSystemTemplate === false);
    check("cloned template name has the (copy) suffix", cloned?.nameEn === "Old PPL (copy)");
  }

  // Source template itself must remain untouched (still legacy — migration
  // script's job, not clone's).
  const sourceAfter = await WorkoutTemplate.findById(legacyTemplateId).lean();
  check(`source template's goal is untouched by cloning (still "${sourceAfter?.goal}")`, sourceAfter?.goal === "general_fitness");

  console.log(`\n${pass} passed, ${fail} failed`);
  await mem.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
