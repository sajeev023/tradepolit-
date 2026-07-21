"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { FormInput } from "@/components/ui/form-input";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (authError) {
      // Supabase error messages can reveal account existence (e.g. "Email not
      // confirmed"). Surface a single generic message to the user; log the
      // real reason server-side only.
      console.error("Password reset failed:", authError.code ?? authError.status);
      setError("If an account exists for that email, a reset link is on its way.");
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--color-accent-primary-muted)" }}>
          <Mail size={28} style={{ color: "var(--color-accent-primary)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Check your email</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>If an account exists with that email, we&apos;ve sent a password reset link.</p>
        <Link href="/login" className="text-sm font-medium" style={{ color: "var(--color-accent-primary)" }}>Back to login</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        <ArrowLeft size={16} /> Back to login
      </Link>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Reset your password</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "var(--color-loss-bg)", color: "var(--color-loss)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>{error}</div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>Email</label>
          <FormInput id="email" type="email" placeholder="you@example.com" icon={<Mail size={16} />} error={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs mt-1.5" style={{ color: "var(--color-loss)" }}>{errors.email.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "#0A0A0B" }}
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}
