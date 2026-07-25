import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString || connectionString.includes("localhost") || connectionString.includes("mockproject")) {
    console.log("[GRANT PRO SCRIPT] No remote database URL configured or using mock DB.");
    return;
  }

  const emails = [
    "sajeevajay683@gmail.com",
    "vanimadari123@gmail.com",
    "ashokmummini.msc@gmail.com",
  ];

  console.log(`[GRANT PRO SCRIPT] Granting PRO plan to ${emails.length} emails in Supabase DB...`);

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
