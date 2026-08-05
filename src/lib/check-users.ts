import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  // Dynamically import prisma AFTER loading env variables
  const { prisma } = await import("./prisma");
  
  // Also pass empty object to avoid crashes on prismaMock findMany
  const users = await prisma.user.findMany({});
  console.log("Users in Database:", JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e));
