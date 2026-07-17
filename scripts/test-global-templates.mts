/**
 * Verifies the Global Templates rules end-to-end against a real MongoDB:
 *
 *  - a coach sees their own templates + global ones, never another coach's
 *  - global templates are read-only for a coach (no edit, no delete)
 *  - duplicating a global template yields an independent coach-owned copy
 *  - only a super admin authors global templates
 *  - templates written before version/featured existed keep behaving correctly
 *  - version increments on edit, and a duplicate restarts at 1
 *  - only a super admin may feature a template; order is featured -> official
 *    -> newest
 *  - custom meal names survive a duplicate, and fall back when absent
 */
import { mkdirSync, rmSync } from "node:fs";

// Same reason as scripts/dev-preview.mts: the C: drive can run out of space and
// corrupt the mongod download/extraction, so point the binary cache and dbPath
// at a drive with room BEFORE mongodb-memory-server reads os.tmpdir().
process.env.MONGOMS_DOWNLOAD_DIR ||= "G:\\mongo-memory-server-cache\\binaries";
process.env.TEMP = "G:\\mongo-memory-server-cache\\tmp";
process.env.TMP = "G:\\mongo-memory-server-cache\\tmp";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  cond ? pass++ : fail++;
};

async function main() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  // wiredTiger persists to dbPath, so wipe it first — a leftover run would
  // otherwise collide on the unique username/email indexes.
  const dbPath = "G:\\mongo-memory-server-cache\\tmp\\global-templates-test";
  rmSync(dbPath, { recursive: true, force: true });
  mkdirSync(dbPath, { recursive: true });

  const mem = await MongoMemoryServer.create({ instance: { dbPath } });
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "fitxnet_test_global";

  const { connectToDatabase } = await import("@/lib/db");
  const { WorkoutTemplate } = await import("@/models/WorkoutTemplate");
  const { NutritionTemplate } = await import("@/models/NutritionTemplate");
  const { User } = await import("@/models/User");
  const { hashPassword } = await import("@/lib/auth/password");
  const { isOfficialTemplate, isGlobalTemplate } = await import("@/lib/templates");
  const { mealDisplayName } = await import("@/lib/i18n/labels");
  const wt = await import("@/lib/services/workout-templates");
  const nt = await import("@/lib/services/nutrition-templates");

  await connectToDatabase();
  await User.init();

  const mkCoach = async (u: string) =>
    User.create({
      name: u,
      username: u,
      email: `${u}@t.com`,
      passwordHash: await hashPassword("x"),
      role: "coach",
      status: "active",
      coachProfile: { maxClients: 0 },
    });

  const coachA = await mkCoach("coacha");
  const coachB = await mkCoach("coachb");
  const scopeA = { role: "coach" as const, coachId: coachA._id.toString() };
  const scopeB = { role: "coach" as const, coachId: coachB._id.toString() };
  const admin = { role: "super_admin" as const };

  /* ---- authoring ---- */

  const a1 = await wt.createWorkoutTemplate(scopeA, { nameAr: "أ١", nameEn: "A1" });
  await wt.createWorkoutTemplate(scopeA, { nameAr: "أ٢", nameEn: "A2" });
  await wt.createWorkoutTemplate(scopeB, { nameAr: "ب١", nameEn: "B1" });
  const gid = await wt.createWorkoutTemplate(admin, {
    nameAr: "فول بودي",
    nameEn: "Full Body Beginner",
  });

  const gDoc = await WorkoutTemplate.findById(gid).lean();
  check("super admin authors an official template", isOfficialTemplate(gDoc!) === true);
  check("official template is global", isGlobalTemplate(gDoc!) === true);
  check("official template has no owning coach", gDoc!.createdByCoach == null);
  check("new template starts at version 1", gDoc!.version === 1);
  check("new template starts unfeatured", gDoc!.featured === false);

  const aDoc = await WorkoutTemplate.findById(a1).lean();
  check("coach authors a NON-official template", isOfficialTemplate(aDoc!) === false);
  check("coach template records its owner", String(aDoc!.createdByCoach) === scopeA.coachId);

  /* ---- a legacy doc: no version/featured fields at all ---- */

  const legacy = await WorkoutTemplate.collection.insertOne({
    nameAr: "قالب قديم",
    nameEn: "Legacy Global",
    weeks: [],
    isSystemTemplate: true,
    createdByCoach: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const legacyDoc = await WorkoutTemplate.findById(legacy.insertedId).lean();
  check("legacy doc really has no version field", legacyDoc!.version === undefined);
  check("legacy doc really has no featured field", legacyDoc!.featured === undefined);
  check("legacy global still reads as official", isOfficialTemplate(legacyDoc!) === true);
  check("legacy global still counts as global", isGlobalTemplate(legacyDoc!) === true);

  /* ---- visibility ---- */

  const listA = await wt.listWorkoutTemplates(scopeA);
  const namesA = listA.map((t) => t.nameEn).sort();
  check(
    "coach A sees own + global (incl. legacy), not B's",
    JSON.stringify(namesA) === JSON.stringify(["A1", "A2", "Full Body Beginner", "Legacy Global"]),
  );

  const listB = await wt.listWorkoutTemplates(scopeB);
  const namesB = listB.map((t) => t.nameEn).sort();
  check(
    "coach B sees own + global, not A's",
    JSON.stringify(namesB) === JSON.stringify(["B1", "Full Body Beginner", "Legacy Global"]),
  );

  check("no coach sees another coach's template", !namesA.includes("B1") && !namesB.includes("A1"));

  const listAdmin = await wt.listWorkoutTemplates(admin);
  check(
    "super admin sees only global templates",
    listAdmin.every((t) => isGlobalTemplate(t)) && listAdmin.length === 2,
  );

  check("global sorts before coach templates", isGlobalTemplate(listA[0]));

  /* ---- direct fetch isolation ---- */

  check("coach B cannot fetch coach A's template by id", (await wt.getWorkoutTemplate(a1, scopeB)) === null);
  check("coach B CAN fetch a global template by id", (await wt.getWorkoutTemplate(gid, scopeB)) !== null);

  /* ---- edit / delete permissions ---- */

  const throws = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return false;
    } catch {
      return true;
    }
  };

  check(
    "coach cannot edit a global template",
    await throws(() => wt.updateWorkoutTemplate(gid, scopeA, { nameAr: "x", nameEn: "x" })),
  );
  check("coach cannot delete a global template", await throws(() => wt.deleteWorkoutTemplate(gid, scopeA)));
  check(
    "coach cannot edit another coach's template",
    await throws(() => wt.updateWorkoutTemplate(a1, scopeB, { nameAr: "x", nameEn: "x" })),
  );
  check(
    "super admin cannot edit a coach's private template",
    await throws(() => wt.updateWorkoutTemplate(a1, admin, { nameAr: "x", nameEn: "x" })),
  );
  check("coach CAN edit their own template", (await wt.updateWorkoutTemplate(a1, scopeA, { nameAr: "أ١ب", nameEn: "A1b" })) === true);
  check("super admin CAN edit a global template", (await wt.updateWorkoutTemplate(gid, admin, { nameAr: "ف", nameEn: "FB" })) === true);

  /* ---- versioning ---- */

  check("editing bumps version to 2", (await WorkoutTemplate.findById(a1).lean())!.version === 2);
  await wt.updateWorkoutTemplate(a1, scopeA, { nameAr: "أ١ج", nameEn: "A1c" });
  check("editing again bumps version to 3", (await WorkoutTemplate.findById(a1).lean())!.version === 3);

  // A legacy doc has no version at all: its first edit must land on 2, not NaN.
  await wt.updateWorkoutTemplate(String(legacy.insertedId), admin, {
    nameAr: "قديم",
    nameEn: "Legacy Global",
  });
  check(
    "editing a legacy (version-less) template lands on 2",
    (await WorkoutTemplate.findById(legacy.insertedId).lean())!.version === 2,
  );

  /* ---- featuring ---- */

  check("coach cannot feature a template", await throws(() => wt.setWorkoutTemplateFeatured(gid, scopeA, true)));
  check("super admin can feature an official template", (await wt.setWorkoutTemplateFeatured(gid, admin, true)) === true);
  const featuredDoc = await WorkoutTemplate.findById(gid).lean();
  check("featuring sets the flag", featuredDoc!.featured === true);
  check("featuring does NOT bump version", featuredDoc!.version === 2);
  check(
    "super admin cannot feature a coach's private template",
    (await wt.setWorkoutTemplateFeatured(a1, admin, true)) === false,
  );
  check(
    "coach A's private template stayed unfeatured",
    (await WorkoutTemplate.findById(a1).lean())!.featured === false,
  );

  // Order must be: featured -> official -> newest.
  const ordered = await wt.listWorkoutTemplates(scopeA);
  check("featured template sorts first", ordered[0].nameEn === "FB" && ordered[0].featured === true);
  check("official sorts above coach templates", isOfficialTemplate(ordered[1]));
  check("coach templates come last", ordered.slice(2).every((t) => !isOfficialTemplate(t)));

  check("super admin can unfeature", (await wt.setWorkoutTemplateFeatured(gid, admin, false)) === true);
  check("unfeaturing clears the flag", (await WorkoutTemplate.findById(gid).lean())!.featured === false);
  await wt.setWorkoutTemplateFeatured(gid, admin, true);

  /* ---- duplication ---- */

  const dupId = await wt.cloneWorkoutTemplate(gid, scopeA);
  const dup = await WorkoutTemplate.findById(dupId).lean();
  check("coach can duplicate an official template", dup !== null);
  check("duplicate is NOT official", isOfficialTemplate(dup!) === false);
  check("duplicate belongs to the duplicating coach", String(dup!.createdByCoach) === scopeA.coachId);
  check("duplicate restarts at version 1", dup!.version === 1);
  check("duplicate is never featured", dup!.featured === false);
  check("coach can edit their duplicate", (await wt.updateWorkoutTemplate(String(dupId), scopeA, { nameAr: "z", nameEn: "z" })) === true);
  check("duplicate is invisible to coach B", (await wt.getWorkoutTemplate(String(dupId), scopeB)) === null);

  // Independence: editing the source must not touch an existing duplicate.
  await wt.updateWorkoutTemplate(gid, admin, { nameAr: "محدث", nameEn: "FB updated" });
  const dupAfter = await WorkoutTemplate.findById(dupId).lean();
  check("editing the source leaves the duplicate's name alone", dupAfter!.nameEn === "z");
  check("editing the source leaves the duplicate's version alone", dupAfter!.version === 2);

  const dupLegacy = await wt.cloneWorkoutTemplate(String(legacy.insertedId), scopeA);
  const dupLegacyDoc = await WorkoutTemplate.findById(dupLegacy).lean();
  check("duplicating a LEGACY global yields a coach-owned copy", isOfficialTemplate(dupLegacyDoc!) === false);

  /* ---- nutrition parity + custom meal names ---- */

  const gnid = await nt.createNutritionTemplate(admin, {
    nameAr: "عام",
    nameEn: "Global Nutrition",
    meals: [
      { type: "lunch", name: { ar: "وجبة ١", en: "Meal 1" }, items: [] },
      { type: "dinner", items: [] },
    ] as never,
  });
  await nt.createNutritionTemplate(scopeB, { nameAr: "ب", nameEn: "B Nutrition" });

  const nListA = await nt.listNutritionTemplates(scopeA);
  check(
    "nutrition: coach A sees global, not coach B's",
    nListA.some((t) => t.nameEn === "Global Nutrition") && !nListA.some((t) => t.nameEn === "B Nutrition"),
  );
  check(
    "nutrition: coach cannot edit a global template",
    await throws(() => nt.updateNutritionTemplate(gnid, scopeA, { nameAr: "x", nameEn: "x" })),
  );

  const nDup = await nt.cloneNutritionTemplate(gnid, scopeA);
  const nDupDoc = await NutritionTemplate.findById(nDup).lean();
  check("nutrition: duplicate is coach-owned", isOfficialTemplate(nDupDoc!) === false);
  check("nutrition: duplicate restarts at version 1", nDupDoc!.version === 1);
  check("nutrition: custom meal name survives duplication", nDupDoc!.meals[0].name?.en === "Meal 1");

  check("custom meal name is rendered", mealDisplayName(nDupDoc!.meals[0], "en") === "Meal 1");
  check("custom meal name is rendered (ar)", mealDisplayName(nDupDoc!.meals[0], "ar") === "وجبة ١");
  check("meal without a name falls back to its type", mealDisplayName(nDupDoc!.meals[1], "en") === "Dinner");
  check(
    "meal with a blank name falls back to its type",
    mealDisplayName({ type: "breakfast", name: { en: "  " } }, "en") === "Breakfast",
  );

  /* ---- legacy nutrition template with no meal names at all ---- */

  const legacyN = await NutritionTemplate.collection.insertOne({
    nameAr: "تغذية قديمة",
    nameEn: "Legacy Nutrition",
    meals: [{ type: "breakfast", items: [] }],
    isSystemTemplate: false,
    createdByCoach: coachA._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const legacyNDoc = await NutritionTemplate.findById(legacyN.insertedId).lean();
  check("legacy coach nutrition template still resolves as coach-owned", isOfficialTemplate(legacyNDoc!) === false);
  check("legacy meal with no name renders its type", mealDisplayName(legacyNDoc!.meals[0], "en") === "Breakfast");
  check(
    "legacy coach template is visible to its owner",
    (await nt.getNutritionTemplate(String(legacyN.insertedId), scopeA)) !== null,
  );
  check(
    "legacy coach template is NOT visible to another coach",
    (await nt.getNutritionTemplate(String(legacyN.insertedId), scopeB)) === null,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  await mem.stop();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
