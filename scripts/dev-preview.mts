/**
 * Preview launcher: spins up an in-memory MongoDB, seeds one user per role,
 * then serves the production build against it. For local previews/screenshots
 * without provisioning a real database. Not used in production.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";

async function main() {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "trainygo_preview";

  const { connectToDatabase } = await import("@/lib/db");
  const { User } = await import("@/models/User");
  const { hashPassword } = await import("@/lib/auth/password");
  const { TRIAL_DURATION_DAYS } = await import("@/lib/constants");

  await connectToDatabase();

  // Seed admin + plans + settings + starter libraries (exercises/foods/templates).
  process.env.SEED_ADMIN_USERNAME = "admin";
  process.env.SEED_ADMIN_PASSWORD = "Admin123!";
  process.env.SEED_ADMIN_EMAIL = "admin@trainygo.com";
  const { seedAll } = await import("@/lib/seed");
  await seedAll(() => {});

  const now = Date.now();
  const coach = await User.create({
    name: "Ahmed Hassan",
    username: "coach",
    email: "coach@trainygo.com",
    phone: "201000000000",
    passwordHash: await hashPassword("Coach123!"),
    role: "coach",
    status: "trial",
    locale: "ar",
    coachProfile: {
      brandName: "Ahmed Fitness",
      trialStartDate: new Date(now),
      trialEndDate: new Date(now + TRIAL_DURATION_DAYS * 86_400_000),
      subscriptionStatus: "trial",
      maxClients: 0,
    },
  });

  await User.create({
    name: "Sara Mohamed",
    username: "client",
    passwordHash: await hashPassword("Client123!"),
    role: "client",
    status: "active",
    locale: "ar",
    mustChangePassword: true,
    clientProfile: { coach: coach._id, clientCode: "TRG00001", active: true },
  });

  console.log("\n✓ In-memory MongoDB seeded:");
  console.log(`  admin  / Admin123!   (super_admin)`);
  console.log(`  coach  / Coach123!   (${coach.role})`);
  console.log(`  client / Client123!  (client)\n`);
  console.log(`MONGODB_URI=${uri}\n`);

  // Serve the production build for fast, fully-compiled pages. Run `npm run
  // build` first. (Swap to "dev" if you prefer hot-reload over speed.)
  const child = spawn("npx", ["next", "start", "-p", "3000"], {
    env: { ...process.env, MONGODB_URI: uri, MONGODB_DB: "trainygo_preview" },
    stdio: "inherit",
    shell: true,
  });

  const shutdown = () => {
    child.kill();
    mem.stop().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
