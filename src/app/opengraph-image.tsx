import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TradCopilot — Trade your plan, not your impulses";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          backgroundColor: "#05070B",
          color: "#F3F4F6",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: "-15%",
            right: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(47, 198, 232, 0.18) 0%, rgba(5, 7, 11, 0) 70%)",
          }}
        />

        {/* Top bar: Wordmark + read-only badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2FC6E8, #0EA5E9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#05070B" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.02em" }}>
              TradCopilot
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "999px",
              border: "1px solid #1A1F28",
              backgroundColor: "#0B0E14",
              fontSize: "14px",
              fontFamily: "monospace",
              color: "#9CA3AF",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2FC6E8" }} />
            <span>READ-ONLY ANALYSIS COPILOT</span>
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "980px" }}>
          <div
            style={{
              fontSize: "64px",
              fontWeight: "600",
              lineHeight: "1.08",
              letterSpacing: "-0.025em",
              color: "#FFFFFF",
            }}
          >
            Trade your plan —
            <br />
            <span style={{ fontStyle: "italic", color: "#2FC6E8" }}>not your impulses.</span>
          </div>
          <p
            style={{
              fontSize: "22px",
              color: "#9CA3AF",
              lineHeight: "1.5",
              maxWidth: "800px",
              margin: "0",
            }}
          >
            Real-time chart analysis, persistent journal memory, and behavioral coaching in one workspace.
          </p>
        </div>

        {/* Bottom meta strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid #1A1F28",
            fontSize: "15px",
            fontFamily: "monospace",
            color: "#6B7280",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <span>BTC · ETH · SOL · FOREX</span>
            <span>·</span>
            <span>MULTI-MODEL AI</span>
            <span>·</span>
            <span>BEHAVIORAL GUARDRAILS</span>
          </div>
          <span style={{ color: "#2FC6E8" }}>tradcopilot.com</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
