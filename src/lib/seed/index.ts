import { connectToDatabase } from "@/lib/db";
import { normalizeGoal } from "@/lib/utils/goals";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { Settings } from "@/models/Settings";
import { Exercise } from "@/models/Exercise";
import { Food } from "@/models/Food";
import { WorkoutTemplate } from "@/models/WorkoutTemplate";
import { NutritionTemplate } from "@/models/NutritionTemplate";
import { hashPassword } from "@/lib/auth/password";
import { importExercises } from "@/lib/import/exercise-import-service";
import { STARTER_EXERCISES } from "./data/exercises";
import { STARTER_FOODS } from "./data/foods";
import { SYSTEM_WORKOUT_TEMPLATES } from "./data/workout-templates";
import { SYSTEM_NUTRITION_TEMPLATES } from "./data/nutrition-templates";

type Log = (msg: string) => void;

export async function seedSettings(log: Log) {
  if (await Settings.findOne({ key: "global" })) return log("• settings — skipped");
  await Settings.create({
    key: "global",
    adminWhatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "201000000000",
  });
  log("✓ settings seeded");
}

export async function seedPlans(log: Log) {
  if ((await Plan.countDocuments()) > 0) return log("• plans — skipped");
  await Plan.create(NEW_PLANS);
  log(`✓ ${NEW_PLANS.length} plans seeded`);
}

/** Current pricing tiers — monthly plans + quarterly packages. Branding is a paid add-on, sold separately (never enabled here). durationMonths drives endDate via addMonths(startDate, durationMonths) — never a raw day count. */
export const NEW_PLANS = [
  { tier: "starter_10", name: { ar: "10 عملاء", en: "Starter 10" }, price: 200, durationMonths: 1, maxClients: 10, sortOrder: 1, features: [{ ar: "حتى 10 عملاء", en: "Up to 10 clients" }] },
  { tier: "growth_20", name: { ar: "20 عميل", en: "Growth 20" }, price: 350, durationMonths: 1, maxClients: 20, sortOrder: 2, features: [{ ar: "حتى 20 عميل", en: "Up to 20 clients" }] },
  { tier: "professional_30", name: { ar: "30 عميل", en: "Professional 30" }, price: 500, durationMonths: 1, maxClients: 30, sortOrder: 3, features: [{ ar: "حتى 30 عميل", en: "Up to 30 clients" }] },
  { tier: "quarterly_starter", name: { ar: "3 شهور - 10 عملاء", en: "Quarterly Starter" }, price: 500, durationMonths: 3, maxClients: 10, sortOrder: 4, features: [{ ar: "حتى 10 عملاء لمدة 3 شهور", en: "Up to 10 clients for 3 months" }] },
  { tier: "quarterly_growth", name: { ar: "3 شهور - 20 عميل", en: "Quarterly Growth" }, price: 750, durationMonths: 3, maxClients: 20, sortOrder: 5, features: [{ ar: "حتى 20 عميل لمدة 3 شهور", en: "Up to 20 clients for 3 months" }] },
  { tier: "quarterly_professional", name: { ar: "3 شهور - 30 عميل", en: "Quarterly Professional" }, price: 1200, durationMonths: 3, maxClients: 30, sortOrder: 6, features: [{ ar: "حتى 30 عميل لمدة 3 شهور", en: "Up to 30 clients for 3 months" }] },
] as const;

export async function seedAdmin(log: Log) {
  if (await User.exists({ role: "super_admin" })) return log("• super admin — skipped");
  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase();
  await User.create({
    name: "FITXNET Admin",
    username,
    email: (process.env.SEED_ADMIN_EMAIL || "admin@fitxnet.com").toLowerCase(),
    passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD || "fit#x#net2026#!"),
    role: "super_admin",
    status: "active",
    locale: "ar",
  });
  log(`✓ super admin seeded (username: ${username})`);
}

export async function seedExercises(log: Log) {
  if ((await Exercise.countDocuments({ isSystemExercise: true })) > 0)
    return log("• exercise library — skipped");
  const res = await importExercises(STARTER_EXERCISES, { source: "manual" });
  log(`✓ exercise library seeded (created ${res.created}, invalid ${res.invalid})`);
}

export async function seedFoods(log: Log) {
  if ((await Food.countDocuments({ isSystemFood: true })) > 0)
    return log("• food library — skipped");
  await Food.insertMany(
    STARTER_FOODS.map((f) => ({ ...f, isSystemFood: true, createdByCoach: null })),
  );
  log(`✓ food library seeded (${STARTER_FOODS.length} items)`);
}

export async function seedWorkoutTemplates(log: Log) {
  if ((await WorkoutTemplate.countDocuments({ isSystemTemplate: true })) > 0)
    return log("• system workout templates — skipped");
  await WorkoutTemplate.insertMany(
    SYSTEM_WORKOUT_TEMPLATES.map((t) => ({
      ...t,
      goal: normalizeGoal(t.goal),
      isSystemTemplate: true,
      createdByCoach: null,
    })),
  );
  log(`✓ ${SYSTEM_WORKOUT_TEMPLATES.length} system workout templates seeded`);
}

export async function seedNutritionTemplates(log: Log) {
  if ((await NutritionTemplate.countDocuments({ isSystemTemplate: true })) > 0)
    return log("• system nutrition templates — skipped");
  await NutritionTemplate.insertMany(
    SYSTEM_NUTRITION_TEMPLATES.map((t) => ({
      ...t,
      isSystemTemplate: true,
      createdByCoach: null,
    })),
  );
  log(`✓ ${SYSTEM_NUTRITION_TEMPLATES.length} system nutrition templates seeded`);
}

/** Run every seeder. Each is individually idempotent (only seeds if empty). */
export async function seedAll(log: Log = console.log) {
  await connectToDatabase();
  await seedSettings(log);
  await seedPlans(log);
  await seedAdmin(log);
  await seedExercises(log);
  await seedFoods(log);
  await seedWorkoutTemplates(log);
  await seedNutritionTemplates(log);
}
