import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString || connectionString.includes("localhost") || connectionString.includes("mockproject")) {
    console.log("[GRANT PRO SCRIPT] No remote database URL configured or using mock DB.");
    return;
  }

  // Emails are never hardcoded here — that would ship real user PII in the
  // repo and silently bypass Stripe-gated upgrades. Pass them explicitly:
  //   GRANT_PRO_EMAILS="a@x.com,b@x.com" node scripts/grant-pro.js
  //   node scripts/grant-pro.js a@x.com b@x.com
  const fromEnv = (process.env.GRANT_PRO_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fromArgv = process.argv.slice(2);
  const emails = [...fromEnv, ...fromArgv];

  if (emails.length === 0) {
    console.error(
      "[GRANT PRO SCRIPT] No emails provided. Set GRANT_PRO_EMAILS or pass emails as CLI args."
    );
    console.error("  GRANT_PRO_EMAILS=\"a@x.com,b@x.com\" node scripts/grant-pro.js");
    console.error("  node scripts/grant-pro.js a@x.com b@x.com");
    process.exit(1);
  }

  console.log(`[GRANT PRO SCRIPT] Granting PRO plan to ${emails.length} email(s) in Supabase DB...`);

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  for (const email of emails) {
    try {
      const users = await prisma.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { profile: true },
      });

      console.log(`Found ${users.length} user(s) for email: ${email}`);

      for (const u of users) {
        await prisma.userProfile.upsert({
          where: { userId: u.id },
          update: {
            plan: "PRO",
            subscriptionStatus: "PRO_ACTIVE",
          },
          create: {
            userId: u.id,
            plan: "PRO",
            subscriptionStatus: "PRO_ACTIVE",
            accountSize: 10000.0,
            maxRiskPercent: 1.0,
            preferredRR: 2.0,
            maxDrawdown: 10.0,
            winRate: 35.0,
            profitFactor: 0.85,
            avgWinLoss: 0.6,
            totalTrades: 12,
          },
        });
        console.log(`✓ Successfully updated UserProfile for userId=${u.id} (${email}) to PRO / PRO_ACTIVE`);
      }
    } catch (err) {
      console.error(`Error updating ${email}:`, err);
    }
  }

  await prisma.$disconnect();
  await pool.end();
  console.log("[GRANT PRO SCRIPT] Completed!");
}

main().catch(console.error);
