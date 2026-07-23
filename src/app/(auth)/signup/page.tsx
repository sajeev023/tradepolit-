"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { FormInput } from "@/components/ui/form-input";
import { analytics } from "@/lib/analytics";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    const supabase = createClient();
    const fallbackName = data.email.split("@")[0];
    
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: fallbackName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/charts`,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/charts");
    router.refresh();
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    analytics.trackGoogleOAuthStarted("signup_page");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/charts` },
    });
    if (authError) {
      setError(authError.message);
      setIsGoogleLoading(false);
    }
  };



  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Joined by 1,400+ Active Traders
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Start Trading Smarter
        </h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Create your free TradCopilot account to get 5 daily AI chart scans, trade journal memory, and risk guardrails.
        </p>
      </div>

      {/* Prominent High-Contrast Google OAuth Primary Button */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isGoogleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-100 transition-all duration-200 shadow-lg cursor-pointer h-[46px] disabled:opacity-50"
      >
        {isGoogleLoading ? <Loader2 size={18} className="animate-spin text-zinc-950" /> : <GoogleIcon />}
        <span>Continue with Google (1-Click)</span>
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-zinc-800/80" />
        <span className="text-[10px] font-bold tracking-wider text-zinc-500">OR</span>
        <div className="flex-1 h-px bg-zinc-800/80" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-lg text-xs" style={{ backgroundColor: "var(--color-loss-bg)", color: "var(--color-loss)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Email address
          </label>
          <FormInput
            id="email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={16} />}
            error={!!errors.email}
            className="h-[44px]"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[10px] mt-1.5 font-medium" style={{ color: "var(--color-loss)" }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Password
          </label>
          <FormInput
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
            icon={<Lock size={16} />}
            error={!!errors.password}
            className="h-[44px]"
            rightElement={
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: "var(--color-text-tertiary)" }} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[10px] mt-1.5 font-medium" style={{ color: "var(--color-loss)" }}>
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-50 cursor-pointer h-[44px] flex items-center justify-center bg-[var(--color-accent-primary)] text-black hover:brightness-105"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin text-black mx-auto" /> : "Create Free Account"}
        </button>
      </form>

      <div className="text-center space-y-4">
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Free during early access. No credit card required.
        </p>
        
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
