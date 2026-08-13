import { V2Navbar } from "@/components/landing/v2/navbar";
import { V2Footer } from "@/components/landing/v2/footer";
import { Observatory } from "@/components/landing/v2/observatory";
import { DisciplineTheater } from "@/components/landing/v2/discipline-theater";
import { InstrumentFilm } from "@/components/landing/v2/instrument-film";
import { Ledger } from "@/components/landing/v2/ledger";
import { Refusals } from "@/components/landing/v2/refusals";
import { BuildLog } from "@/components/landing/v2/build-log";
import { Prospectus } from "@/components/landing/v2/prospectus";
import { Signature } from "@/components/landing/v2/signature";

/* ═══════════════════════════════════════════════════════════════════════
   TradCopilot — marketing homepage (v2 "read-only intelligence" redesign).

   UI/UX ONLY. No product behavior, server logic, or data paths changed.
   The eight sections are each a distinct structure (no repeated skeleton),
   composed top-to-bottom inside a single .landing-v2 wrapper that scopes
   the additive v2 design tokens so dashboard/auth styling is untouched.
   ═══════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="landing-v2">
      <V2Navbar />

      <main>
        {/* SEC 01 — The Observatory (hero) */}
        <Observatory />

        {/* SEC 02 — The Discipline Theater (before/after) */}
        <DisciplineTheater />

        {/* SEC 03 — The Instrument (three-act film) */}
        <InstrumentFilm />

        {/* SEC 04 — The Ledger (proof) */}
        <Ledger />

        {/* SEC 05 — Refusals (positioning) */}
        <Refusals />

        {/* SEC 06 — The Build Log (founder story) */}
        <BuildLog />

        {/* SEC 07 — The Prospectus (trust) */}
        <Prospectus />

        {/* SEC 08 — The Signature (final CTA + pricing) */}
        <Signature />
      </main>

      <V2Footer />
    </div>
  );
}