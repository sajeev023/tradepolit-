"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const DEMO_EMAILS = ["partner@tradepilot.ai", "trader@tradepilot.app"];

export function useIsDemoUser(): { isDemo: boolean; isLoading: boolean } {
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      const user = data.user;
      setIsDemo(user?.email ? DEMO_EMAILS.includes(user.email) : false);
      setIsLoading(false);
    });
  }, []);

  return { isDemo, isLoading };
}
