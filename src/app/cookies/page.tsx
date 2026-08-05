import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "TradCopilot cookie policy — how we use cookies and similar tracking technologies on our trading platform.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6 text-teal-400">
          <Cookie size={24} />
          <h1 className="text-2xl font-bold text-white">Cookie Policy</h1>
        </div>

        <p className="text-xs mb-8 text-zinc-500">Last updated: July 12, 2026</p>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your computer or mobile device by your web browser when you visit a website. They are widely used to make websites work more efficiently and to provide user preferences or authentication state to the server.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Types of Cookies We Use</h2>
            <p>
              We only use cookies that are strictly necessary or functional to run the application:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>**Session Cookies:** To verify your login state and identify your active user session.</li>
              <li>**Preference Cookies:** To store UI settings (such as your preference for the dark theme, sidebar collapse status, or last-analyzed symbol).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. No Advertising Cookies</h2>
            <p>
              **TradCopilot does not use any advertising cookies, marketing tracking scripts, or analytics scripts that monitor your behavior across other websites.** We respect your privacy and limit our client-side storage strictly to functional data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Third-Party Cookies</h2>
            <p>
              Some third-party integrations we use may set cookies on your browser:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>**Supabase / Google Authentication:** Sets authentication tokens so you stay securely logged in across visits.</li>
              <li>**Stripe / Razorpay / Gumroad:** Sets cookies necessary to verify subscription orders and prevent checkout fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. How to Disable Cookies</h2>
            <p>
              You can control or disable cookies by modifying your web browser settings. Please note that if you block all cookies, TradCopilot will not be able to verify your login credentials, and the dashboard functions will become inaccessible.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Changes to Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date.
            </p>
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        © 2026 TradCopilot. Educational and analytical services only.
      </footer>
    </div>
  );
}
