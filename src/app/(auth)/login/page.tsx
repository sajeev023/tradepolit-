"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

/* ─────────────────────────────────────────────
   SCHEMA
───────────────────────────────────────────── */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}


function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   STYLED INPUT
───────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  rightEl?: React.ReactNode;
  error?: string;
}

function PremiumInput({ id, label, icon, rightEl, error, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: focused ? "#FAFAFA" : "#71717A",
          transition: "color 0.2s ease",
          userSelect: "none",
        }}
      >
        {label}
      </label>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          borderRadius: 10,
          border: `1px solid ${hasError ? "rgba(239,68,68,0.6)" : focused ? "rgba(6, 182, 212,0.5)" : "rgba(255,255,255,0.08)"}`,
          background: focused ? "rgba(6, 182, 212,0.04)" : "rgba(255,255,255,0.03)",
          boxShadow: focused && !hasError ? "0 0 0 3px rgba(6, 182, 212,0.08)" : "none",
          transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {icon && (
          <div
            style={{
              position: "absolute",
              left: 13,
              color: focused ? "var(--color-accent-primary)" : "#52525B",
              transition: "color 0.2s ease",
              display: "flex",
              pointerEvents: "none",
            }}
          >
            {icon}
          </div>
        )}

        <input
          id={id}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: 48,
            paddingLeft: icon ? 40 : 14,
            paddingRight: rightEl ? 42 : 14,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 16, /* Prevents iOS zoom — never go below 16px */
            color: "#FAFAFA",
            fontFamily: "var(--font-sans)",
            letterSpacing: rest.type === "password" ? "0.1em" : undefined,
          }}
          {...rest}
        />

        {rightEl && (
          <div
            style={{
              position: "absolute",
              right: 12,
              color: "#52525B",
              display: "flex",
              cursor: "pointer",
            }}
          >
            {rightEl}
          </div>
        )}
      </div>

      {error && (
        <p
          style={{
            fontSize: 12,
            color: "#EF4444",
            marginTop: 2,
            animation: "shake 0.3s ease",
          }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIVIDER
───────────────────────────────────────────── */
function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: "#3F3F46", letterSpacing: "0.08em" }}>OR</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUCCESS OVERLAY
───────────────────────────────────────────── */
function SuccessOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        background: "rgba(9,9,11,0.9)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        zIndex: 10,
        animation: "auth-enter 0.4s ease",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(6, 182, 212,0.12)",
          border: "2px solid rgba(6, 182, 212,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "auth-enter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth={2.5} strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: "#FAFAFA" }}>Signing you in…</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN CONTENT
───────────────────────────────────────────── */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/charts";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Card tilt on hover
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMouse = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `perspective(900px) rotateX(${-dy * 2}deg) rotateY(${dx * 2}deg) translateY(-2px)`;
    };
    const handleLeave = () => {
      card.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateY(0)";
    };
    card.addEventListener("mousemove", handleMouse);
    card.addEventListener("mouseleave", handleLeave);
    return () => {
      card.removeEventListener("mousemove", handleMouse);
      card.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError) {
      setError(authError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push(redirectTo);
      router.refresh();
    }, 800);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
    if (authError) {
      setError(authError.message);
      setIsGoogleLoading(false);
    }
  };

  const isLoading = isSubmitting || isGoogleLoading;

  return (
    <>
      <style>{`
        @keyframes auth-enter {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(6, 182, 212,0.25); }
          70%  { box-shadow: 0 0 0 10px rgba(6, 182, 212,0); }
          100% { box-shadow: 0 0 0 0 rgba(6, 182, 212,0); }
        }
        .login-card {
          animation: auth-enter 0.6s cubic-bezier(0.16,1,0.3,1) both;
          will-change: transform;
          transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease;
        }
        .social-btn {
          transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
        }
        .social-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .social-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.99);
        }
        .primary-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .primary-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .primary-btn:hover:not(:disabled)::after { opacity: 1; }
        .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(6, 182, 212,0.3); }
        .primary-btn:active:not(:disabled) { transform: translateY(1px) scale(0.99); }
        .demo-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
        }
        .eye-btn:hover { color: #A1A1AA !important; }
        .remember-check:hover { border-color: rgba(6, 182, 212,0.5) !important; }
      `}</style>

      <div
        ref={cardRef}
        className="login-card"
        style={{
          position: "relative",
          background: "rgba(17,17,19,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {success && <SuccessOverlay />}

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#FAFAFA",
              margin: "0 0 6px",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "#71717A", margin: 0 }}>
            Sign in to your TradCopilot account
          </p>
        </div>

        {/* Google */}
        <button
          id="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          aria-label="Continue with Google"
          className="social-btn"
          style={{
            width: "100%",
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#A1A1AA",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {isGoogleLoading ? <SpinnerIcon /> : <GoogleIcon />}
          Continue with Google
        </button>

        <OrDivider />

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}
          noValidate
        >
          {/* Global error */}
          {error && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
                fontSize: 13,
                color: "#FCA5A5",
                animation: "shake 0.3s ease",
              }}
            >
              {error}
            </div>
          )}

          <PremiumInput
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            icon={<MailIcon />}
            error={errors.email?.message}
            autoComplete="email"
            {...register("email")}
          />

          <PremiumInput
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={<LockIcon />}
            error={errors.password?.message}
            autoComplete="current-password"
            rightEl={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="eye-btn"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#52525B",
                  display: "flex",
                  transition: "color 0.15s ease",
                }}
              >
                <EyeIcon open={showPassword} />
              </button>
            }
            {...register("password")}
          />

          {/* Remember + Forgot */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                id="remember"
                type="checkbox"
                {...register("remember")}
                style={{ display: "none" }}
              />
              <div
                className="remember-check"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                  flexShrink: 0,
                  transition: "border-color 0.2s",
                }}
              />
              <span style={{ fontSize: 12, color: "#71717A" }}>Remember me</span>
            </label>

            <Link
              href="/forgot-password"
              style={{
                fontSize: 12,
                color: "var(--color-accent-primary)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "opacity 0.15s",
              }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            id="signin-btn"
            type="submit"
            disabled={isLoading}
            aria-label="Sign in"
            className="primary-btn"
            style={{
              width: "100%",
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,var(--color-accent-primary) 0%,var(--color-accent-primary) 100%)",
              color: "var(--background)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginTop: 4,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#52525B", textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "#A1A1AA",
                fontWeight: 500,
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: 1,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              Create an account
            </Link>
          </p>

          <p style={{ fontSize: 11, color: "#3F3F46", textAlign: "center" }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: "#52525B", textDecoration: "underline" }}>
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" style={{ color: "#52525B", textDecoration: "underline" }}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   PAGE EXPORT
───────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        width: "100%",
        maxWidth: 400,
        height: 520,
        borderRadius: 20,
        background: "rgba(17,17,19,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: "pulse 1.5s ease infinite",
      }} />
    }>
      <LoginPageContent />
    </Suspense>
  );
}
