/**
 * Phase 5 integration tests against an in-memory MongoDB.
 * Covers: sequential code+username, coach isolation, deep-copy independence,
 * macro calc, personal-record calc, subscription write-gate, copy system,
 * exercise visibility/permissions, and new-client notifications.
 * Not part of the app — safe to delete.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  cond ? pass++ : fail++;
}

async function main() {
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "trainygo_test5";

  const { connectToDatabase } = await import("@/lib/db");
  const { User } = await import("@/models/User");
  const { ClientProgram } = await import("@/models/ClientProgram");
  const { Notification } = await import("@/models/Notification");
  const { hashPassword } = await import("@/lib/auth/password");
  const clients = await import("@/lib/services/clients");
  const wt = await import("@/lib/services/workout-templates");
  const nt = await import("@/lib/services/nutrition-templates");
  const programs = await import("@/lib/services/programs");
  const plans = await import("@/lib/services/nutrition-plans");
  const copy = await import("@/lib/services/copy");
  const exercises = await import("@/lib/services/exercises");
  const { computePlanTotals } = await import("@/lib/services/nutrition-calc");
  const { epley1RM, bestOneRm } = await import("@/lib/services/workout-logs");
  const { coachCanWrite, assertCoachCanWrite, PermissionError } = await import("@/lib/permissions");

  await connectToDatabase();
  await User.init();

  // Two coaches for isolation tests
  const coachA = await User.create({ name: "Coach A", username: "coacha", email: "a@t.com", passwordHash: await hashPassword("x"), role: "coach", status: "active" });
  const coachB = await User.create({ name: "Coach B", username: "coachb", email: "b@t.com", passwordHash: await hashPassword("x"), role: "coach", status: "active" });
  const A = coachA._id.toString();
  const B = coachB._id.toString();

  // ---- 1. Sequential client code + derived username ----
  const c1 = await clients.createClient(A, { name: "Client One", phone: "0100" });
  const c2 = await clients.createClient(A, { name: "Client Two", phone: "0101" });
  check(`sequential code TRG00001 (${c1.credentials.code})`, c1.credentials.code === "TRG00001");
  check(`sequential code TRG00002 (${c2.credentials.code})`, c2.credentials.code === "TRG00002");
  check(`username derived from code (${c1.credentials.username})`, c1.credentials.username === "trg00001");
  check("temp password generated", c1.credentials.password.length === 8);

  // ---- 2. New-client notification ----
  const notif = await Notification.findOne({ recipient: A, type: "new_client" });
  check("new-client notification created for coach", !!notif);

  // ---- 3. Coach isolation ----
  const listA = await clients.listClients(A);
  const listB = await clients.listClients(B);
  check("coach A sees own 2 clients", listA.length === 2);
  check("coach B sees 0 clients (isolation)", listB.length === 0);
  check("coach B cannot getClient of A's client", (await clients.getClient(B, c1.clientId)) === null);
  check("coach B cannot update A's client", (await clients.updateClient(B, c1.clientId, { name: "Hacked" })) === false);
  check("coach B cannot delete A's client", (await clients.deleteClient(B, c1.clientId)) === false);
  const stillThere = await clients.getClient(A, c1.clientId);
  check("A's client name unchanged after B's attempt", (stillThere as { name?: string })?.name === "Client One");

  // ---- 4. Deep-copy independence (template -> client program) ----
  const tplId = await wt.createWorkoutTemplate(
    { role: "coach", coachId: A },
    {
      nameAr: "قالب", nameEn: "Tpl",
      weeks: [{ weekNumber: 1, name: { ar: "1", en: "1" }, days: [{ dayNumber: 1, name: { ar: "د", en: "D" }, exercises: [{ exercise: null, nameAr: "أصلي", nameEn: "Original", sets: 3, reps: "10", restSeconds: 60, order: 1 }] }] }],
    },
  );
  const progId = await programs.assignTemplateToClient(A, tplId, c1.clientId);
  // mutate the template AFTER assignment
  await wt.updateWorkoutTemplate(tplId, { role: "coach", coachId: A }, {
    nameAr: "قالب", nameEn: "Tpl",
    weeks: [{ weekNumber: 1, name: { ar: "1", en: "1" }, days: [{ dayNumber: 1, name: { ar: "د", en: "D" }, exercises: [{ exercise: null, nameAr: "معدّل", nameEn: "CHANGED", sets: 5, reps: "5", restSeconds: 60, order: 1 }] }] }],
  });
  const prog = await ClientProgram.findById(progId).lean();
  const progExName = prog?.weeks?.[0]?.days?.[0]?.exercises?.[0]?.nameEn;
  check(`program independent of template edit (got "${progExName}")`, progExName === "Original");

  // ---- 5. Coach isolation on assignment ----
  let blocked = false;
  try { await programs.assignTemplateToClient(B, tplId, c1.clientId); } catch (e) { blocked = e instanceof PermissionError; }
  check("coach B cannot assign template to A's client", blocked);

  // ---- 6. Macro calculation ----
  const totals = computePlanTotals([
    { type: "breakfast", items: [{ food: null, nameAr: "", nameEn: "", quantity: 1, unit: "100g", calories: 200, protein: 20, carbs: 10, fat: 5, fiber: 2, substitutes: [] }] },
    { type: "lunch", items: [{ food: null, nameAr: "", nameEn: "", quantity: 1, unit: "100g", calories: 300, protein: 30, carbs: 20, fat: 10, fiber: 3, substitutes: [] }] },
  ]);
  check(`macro totals sum correctly (cal=${totals.calories}, p=${totals.protein})`, totals.calories === 500 && totals.protein === 50 && totals.carbs === 30 && totals.fat === 15);

  // ---- 7. Nutrition plan deep-copy recomputes totals ----
  const ntId = await nt.createNutritionTemplate({ role: "coach", coachId: A }, {
    nameAr: "تغذية", nameEn: "Nut",
    meals: [{ type: "lunch", items: [{ food: null, nameAr: "دجاج", nameEn: "Chicken", quantity: 1, unit: "100g", calories: 400, protein: 40, carbs: 30, fat: 10, fiber: 0, substitutes: [] }] }],
  });
  const planId = await plans.assignNutritionTemplateToClient(A, ntId, c1.clientId);
  const plan = await (await import("@/models/NutritionPlan")).NutritionPlan.findById(planId).lean();
  check(`nutrition plan totals computed on assign (cal=${plan?.totals?.calories})`, plan?.totals?.calories === 400);

  // ---- 8. Personal record (Epley 1RM) ----
  check(`Epley 1RM 100x10 ≈ 133.3 (${epley1RM(100, 10)})`, epley1RM(100, 10) === 133.3);
  check("bestOneRm picks heaviest set", bestOneRm([{ setNumber: 1, weight: 80, reps: 10 }, { setNumber: 2, weight: 100, reps: 5 }]) === Math.round(100 * (1 + 5 / 30) * 10) / 10);

  // ---- 9. Subscription write-gate ----
  check("active coach can write", coachCanWrite("active"));
  check("trial coach can write", coachCanWrite("trial"));
  check("expired coach cannot write", !coachCanWrite("expired"));
  let gated = false;
  try { assertCoachCanWrite("expired"); } catch (e) { gated = e instanceof PermissionError; }
  check("assertCoachCanWrite throws for expired", gated);

  // ---- 10. Copy system: template -> multiple clients ----
  const copyRes = await copy.copyTemplatesToClients(A, { workoutTemplateId: tplId }, [c1.clientId, c2.clientId]);
  check(`template copied to 2 clients (${copyRes.programs} programs)`, copyRes.programs === 2);
  const progsForA = await programs.listPrograms(A);
  check("coach A now has multiple programs", progsForA.length >= 3);

  // ---- 11. Exercise visibility & permissions ----
  const sysExId = await exercises.createExercise({ role: "super_admin" }, { nameAr: "نظام", nameEn: "System Ex", category: "chest", targetMuscles: [], gifUrl: "", youtubeUrl: "" });
  const coachExId = await exercises.createExercise({ role: "coach", coachId: A }, { nameAr: "مخصص", nameEn: "Coach Ex", category: "back", targetMuscles: [], gifUrl: "", youtubeUrl: "" });
  const visA = await exercises.listExercises({ role: "coach", coachId: A }, { limit: 50 });
  const visB = await exercises.listExercises({ role: "coach", coachId: B }, { limit: 50 });
  check("coach A sees system + own custom (2)", visA.total === 2);
  check("coach B sees system only (1)", visB.total === 1);
  let coachCantEditSystem = false;
  try { await exercises.updateExercise(sysExId, { role: "coach", coachId: A }, { nameAr: "x", nameEn: "x", category: "chest", targetMuscles: [], gifUrl: "", youtubeUrl: "" }); } catch (e) { coachCantEditSystem = e instanceof PermissionError; }
  check("coach cannot edit system exercise", coachCantEditSystem);
  void coachExId;

  console.log(`\n${pass} passed, ${fail} failed`);
  await mem.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
