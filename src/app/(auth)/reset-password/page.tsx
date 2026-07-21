"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { FormInput } from "@/components/ui/form-input";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setIsValidSession(!!session);
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password: data.password });
    if (authError) { setError(authError.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/charts"), 2000);
  };

  if (isValidSession === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-accent-primary)" }} />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Invalid or expired link</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>This password reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="text-sm font-medium" style={{ color: "var(--color-accent-primary)" }}>Request a new link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--color-accent-primary-muted)" }}>
          <CheckCircle2 size={28} style={{ color: "var(--color-accent-primary)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Password updated</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Redirecting to charts...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Set new password</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "var(--color-loss-bg)", color: "var(--color-loss)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>{error}</div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>New Password</label>
          <FormInput
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
            icon={<Lock size={16} />}
            error={!!errors.password}
            rightElement={
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: "var(--color-text-tertiary)" }} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register("password")}
          />
          {errors.password && <p className="text-xs mt-1.5" style={{ color: "var(--color-loss)" }}>{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>Confirm New Password</label>
          <FormInput
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your password"
            icon={<Lock size={16} />}
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-xs mt-1.5" style={{ color: "var(--color-loss)" }}>{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "#0A0A0B" }}
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Update Password"}
        </button>
      </form>
    </div>
  );
}
