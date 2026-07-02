/**
 * Phase 6 integration tests against an in-memory MongoDB.
 * Covers: messaging (send/isolation/unread/read), admin subscription activation,
 * program-builder edit independence, workout-execution personal records,
 * multi-client copy, and nutrition-plan recompute on edit.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { console.log(`${cond ? "✓" : "✗"} ${name}`); cond ? pass++ : fail++; };

async function main() {
  const mem = await MongoMemoryServer.create({ instance: { storageEngine: "ephemeralForTest" } });
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "trainygo_test6";

  const { connectToDatabase } = await import("@/lib/db");
  const { User } = await import("@/models/User");
  const { Plan } = await import("@/models/Plan");
  const { WorkoutTemplate } = await import("@/models/WorkoutTemplate");
  const { hashPassword } = await import("@/lib/auth/password");
  const { PermissionError } = await import("@/lib/permissions");
  const clients = await import("@/lib/services/clients");
  const wt = await import("@/lib/services/workout-templates");
  const nt = await import("@/lib/services/nutrition-templates");
  const programs = await import("@/lib/services/programs");
  const nplans = await import("@/lib/services/nutrition-plans");
  const copy = await import("@/lib/services/copy");
  const wlogs = await import("@/lib/services/workout-logs");
  const messages = await import("@/lib/services/messages");
  const admin = await import("@/lib/services/admin");

  await connectToDatabase();
  await User.init();

  const coachA = await User.create({ name: "Coach A", username: "coacha", email: "ca@t.com", passwordHash: await hashPassword("x"), role: "coach", status: "trial", coachProfile: { maxClients: 0 } });
  const coachB = await User.create({ name: "Coach B", username: "coachb", email: "cb@t.com", passwordHash: await hashPassword("x"), role: "coach", status: "active" });
  const A = coachA._id.toString(), B = coachB._id.toString();
  const c1 = await clients.createClient(A, { name: "Cli One", phone: "1" });
  const c2 = await clients.createClient(A, { name: "Cli Two", phone: "2" });

  // ---- Messaging ----
  const convo = await messages.getOrCreateConversation(A, c1.clientId);
  await messages.sendMessage(convo._id.toString(), A, "coach", { text: "Hello" });
  const msgs = await messages.getMessages(convo._id.toString(), A, "coach");
  check("message sent & retrieved", msgs.length === 1 && msgs[0].text === "Hello");
  let msgIso = false;
  try { await messages.getMessages(convo._id.toString(), B, "coach"); } catch (e) { msgIso = e instanceof PermissionError; }
  check("coach B cannot read A's conversation", msgIso);
  check("client has 1 unread", (await messages.countUnreadMessages(c1.clientId, "client")) === 1);
  await messages.markRead(convo._id.toString(), c1.clientId, "client");
  check("unread cleared after markRead", (await messages.countUnreadMessages(c1.clientId, "client")) === 0);
  await messages.sendMessage(convo._id.toString(), c1.clientId, "client", { text: "Hi coach" });
  check("coach has 1 unread after client reply", (await messages.countUnreadMessages(A, "coach")) === 1);

  // ---- Admin subscription activation ----
  const plan = await Plan.create({ tier: "professional_30", name: { ar: "احترافي", en: "Pro" }, price: 599, durationMonths: 1, maxClients: 50 });
  await admin.activateSubscription(B, A, { planId: plan._id.toString() });
  const refreshedA = await User.findById(A).lean();
  check("subscription activation sets coach active", refreshedA?.status === "active");
  check("subscription sets end date + plan", !!refreshedA?.coachProfile?.subscriptionEndDate && String(refreshedA?.coachProfile?.currentPlan) === plan._id.toString());
  check("subscription sets maxClients from plan", refreshedA?.coachProfile?.maxClients === 50);
  const stats = await admin.getAdminStats();
  check(`admin stats count coaches (${stats.totalCoaches})`, stats.totalCoaches === 2 && stats.totalClients === 2);
  check(`admin revenue from subscription (${stats.revenue})`, stats.revenue === 599);

  // ---- Program builder edit + independence ----
  const tplId = await wt.createWorkoutTemplate({ role: "coach", coachId: A }, {
    nameAr: "ق", nameEn: "T",
    weeks: [{ weekNumber: 1, name: { ar: "1", en: "1" }, days: [{ dayNumber: 1, name: { ar: "د", en: "D" }, exercises: [{ exercise: null, nameAr: "أصل", nameEn: "Orig", sets: 3, reps: "10", restSeconds: 60, order: 1 }] }] }],
  });
  const progId = await programs.assignTemplateToClient(A, tplId, c1.clientId);
  await programs.updateProgramWeeks(A, progId, {
    weeks: [{ weekNumber: 1, name: { ar: "1", en: "1" }, days: [{ dayNumber: 1, name: { ar: "د", en: "D" }, exercises: [{ exercise: null, nameAr: "معدل", nameEn: "Edited", sets: 5, reps: "5", restSeconds: 90, order: 1 }] }] }] as never,
  });
  const editedProg = await programs.getProgram(A, progId);
  const tplAfter = await WorkoutTemplate.findById(tplId).lean();
  check("program edit saved", editedProg?.weeks?.[0]?.days?.[0]?.exercises?.[0]?.nameEn === "Edited");
  check("template unchanged by program edit", tplAfter?.weeks?.[0]?.days?.[0]?.exercises?.[0]?.nameEn === "Orig");

  // ---- Workout execution → personal record ----
  await wlogs.logExercise(c1.clientId, A, { exerciseNameAr: "بنش", exerciseNameEn: "Bench", sets: [{ setNumber: 1, weight: 100, reps: 5 }], completed: true });
  const prs = await wlogs.getPersonalRecords(c1.clientId);
  check(`personal record computed (1RM ${prs[0]?.bestOneRm})`, prs.length === 1 && prs[0].bestOneRm === wlogs.epley1RM(100, 5));

  // ---- Multi-client copy ----
  const copyRes = await copy.copyTemplatesToClients(A, { workoutTemplateId: tplId }, [c1.clientId, c2.clientId]);
  check(`template copied to 2 clients (${copyRes.programs})`, copyRes.programs === 2);

  // ---- Nutrition plan recompute on edit ----
  const ntId = await nt.createNutritionTemplate({ role: "coach", coachId: A }, { nameAr: "ت", nameEn: "N", meals: [{ type: "lunch", items: [{ food: null, nameAr: "دجاج", nameEn: "Chicken", quantity: 100, unit: "100g", calories: 200, protein: 20, carbs: 0, fat: 5, fiber: 0, substitutes: [] }] }] });
  const planId = await nplans.assignNutritionTemplateToClient(A, ntId, c1.clientId);
  await nplans.updatePlanMeals(A, planId, [{ type: "lunch", items: [{ food: null, nameAr: "دجاج", nameEn: "Chicken", quantity: 100, unit: "100g", calories: 500, protein: 50, carbs: 0, fat: 10, fiber: 0, substitutes: [] }] }] as never);
  const editedPlan = await nplans.getNutritionPlan(A, planId);
  check(`plan totals recomputed on edit (${editedPlan?.totals?.calories})`, editedPlan?.totals?.calories === 500);

  console.log(`\n${pass} passed, ${fail} failed`);
  await mem.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
