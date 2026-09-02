/**
 * src/lib/email.ts
 *
 * Transactional email (V2.5) — the thesis-resolution digest.
 *
 * Design:
 *  - Resend HTTP API (no SDK dependency; one fetch call).
 *  - HARD no-op without RESEND_API_KEY — email is an enhancement, never
 *    a dependency. Nothing else in the codebase imports a failure path
 *    from this module.
 *  - Never throws to callers; failures are logged only.
 *  - No PII in subject lines; bodies contain only the user's own data.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface DigestThesis {
  symbol: string;
  timeframe: string;
  bias: string;
  status: "HIT" | "INVALIDATED" | "EXPIRED";
  resolvedPrice: number | null;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "";
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM_EMAIL || "TradCopilot <digest@resend.dev>",
        to,
        subject,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[EMAIL] Send failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Send error:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** The thesis-resolution digest: "N theses resolved overnight — review them." */
export async function sendResolutionDigest(
  to: string,
  displayName: string | null,
  theses: DigestThesis[]
): Promise<boolean> {
  if (theses.length === 0) return true;
  const name = displayName || "there";

  const rows = theses
    .map((t) => {
      const tone =
        t.status === "HIT" ? "#10b981" : t.status === "INVALIDATED" ? "#ef4444" : "#a1a1aa";
      const label =
        t.status === "HIT" ? "Target hit" : t.status === "INVALIDATED" ? "Invalidated" : "Expired";
      const price = t.resolvedPrice !== null ? ` at $${t.resolvedPrice.toLocaleString()}` : "";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;font-family:monospace;color:#e4e4e7;">${t.symbol} <span style="color:#71717a">${t.timeframe}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;">${t.bias}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:${tone};font-weight:600;">${label}${price}</td>
      </tr>`;
    })
    .join("");

  const html = `
  <div style="background:#09090b;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:24px;border-bottom:1px solid #27272a;">
        <div style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">TradCopilot · Thesis Monitor</div>
        <h1 style="color:#fafafa;font-size:18px;margin:0;">${theses.length} ${theses.length === 1 ? "thesis resolved" : "theses resolved"}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:8px 0 0;">
          Hi ${name} — the market moved on ${theses.length === 1 ? "a thesis you're tracking" : "theses you're tracking"}. Close the loop: log what happened and what it taught you.
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#d4d4d8;">
        <thead>
          <tr style="color:#71717a;font-size:11px;text-transform:uppercase;">
            <th style="text-align:left;padding:8px 12px;">Thesis</th>
            <th style="text-align:left;padding:8px 12px;">Bias</th>
            <th style="text-align:left;padding:8px 12px;">Result</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="padding:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://tradcopilot.com"}/theses"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;">
          Review outcomes
        </a>
        <p style="color:#52525b;font-size:11px;margin:16px 0 0;">
          You receive this when a monitored thesis resolves (at most once a day).
          Manage notifications in Settings.
        </p>
      </div>
    </div>
  </div>`;

  return send(to, `${theses.length} ${theses.length === 1 ? "thesis" : "theses"} resolved — review the outcome`, html);
}