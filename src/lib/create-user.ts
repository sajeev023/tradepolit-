import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log("Supabase URL:", url);
  console.log("Anon Key:", anonKey ? "Configured" : "Missing");

  const supabase = createClient(url, anonKey);
  
  const email = `testtrader-${Date.now()}@test.com`;
  const password = "Password123!";

  console.log(`Attempting to sign up: ${email}`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Test Trader"
      }
    }
  });

  if (error) {
    console.error("Signup failed:", error);
  } else {
    console.log("Signup success:", JSON.stringify(data, null, 2));
  }
}

main().catch(e => console.error(e));
