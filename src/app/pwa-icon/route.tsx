import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED_SIZES = [180, 192, 512] as const;

/** PNG app icon for the web manifest and iOS home screen. `?size=192|512|180`. */
export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = ALLOWED_SIZES.find((s) => s === requested) ?? 512;
  const glyph = Math.round(size * 0.52);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#D7F83C",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="#10120A">
          <path d="M4.5 17.5 12 3l7.5 14.5L12 13.4z" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
