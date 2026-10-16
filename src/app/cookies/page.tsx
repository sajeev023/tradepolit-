import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Cookie } from "lucide-react";
import LegalLayout, { LegalSection, P, Strong } from "@/components/legal/LegalLayout";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "How TradCopilot uses essential and functional cookies for sessions, state, and theme — and why we use no marketing or cross-site trackers.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="July 12, 2026" icon={<Cookie size={24} />}>
      <LegalSection title="1. What Are Cookies?">
        <P>
          Cookies are small text files stored on your computer or mobile device by your web browser when you visit a website. They are widely used to make websites work more efficiently and to provide user preferences or authentication state to the server.
        </P>
      </LegalSection>

      <LegalSection title="2. Types of Cookies We Use">
        <P>
          We only use cookies that are strictly necessary or functional to run the application:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><Strong>Session Cookies:</Strong> To verify your login state and identify your active user session.</li>
          <li><Strong>Preference Cookies:</Strong> To store UI settings (such as your preference for the dark theme, sidebar collapse status, or last-analyzed symbol).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. No Advertising Cookies">
        <P>
          <Strong>TradCopilot does not use any advertising cookies, marketing tracking scripts, or analytics scripts that monitor your behavior across other websites.</Strong> We respect your privacy and limit our client-side storage strictly to functional data.
        </P>
      </LegalSection>

      <LegalSection title="4. Third-Party Cookies">
        <P>
          Some third-party integrations we use may set cookies on your browser:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><Strong>Supabase / Google Authentication:</Strong> Sets authentication tokens so you stay securely logged in across visits.</li>
          <li><Strong>Stripe / Razorpay / Gumroad:</Strong> Sets cookies necessary to verify subscription orders and prevent checkout fraud.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How to Disable Cookies">
        <P>
          You can control or disable cookies by modifying your web browser settings. Please note that if you block all cookies, TradCopilot will not be able to verify your login credentials, and the dashboard functions will become inaccessible.
        </P>
      </LegalSection>

      <LegalSection title="6. Changes to Cookie Policy">
        <P>
          We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date.
        </P>
      </LegalSection>
    </LegalLayout>
  );
}