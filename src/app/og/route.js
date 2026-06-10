import { ImageResponse } from "next/og";

export const runtime = "edge";

// OG image generator, 1200×630.
//   /og?title=...&subtitle=...&meta=...&path=...
// Shared by the homepage, provider pages (/[org]), and recipe detail pages
// (/[org]/[repo]). Matches the vLLM blog OG design (top brand-gradient bar,
// three bottom-right ring accents, system font) and adds a recipes-specific
// "/ Recipes" wordmark next to the logo.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Model Recipes";
  const subtitle = searchParams.get("subtitle") || "";
  const meta = searchParams.get("meta") || "";
  const path = searchParams.get("path") || "";
  // Optional bottom-left chip. Recipe pages pass `version` ("vLLM 0.18+");
  // provider/homepage can pass `cta` for a marketing line. If neither is set
  // the footer collapses to URL-only.
  const cta = searchParams.get("cta") || "";
  const version = searchParams.get("version") || "";

  const titleSize = title.length > 48 ? "44px" : title.length > 32 ? "56px" : "68px";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top brand-gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #fdb517 0%, #f59e0b 35%, #30a2ff 100%)",
            display: "flex",
          }}
        />

        {/* Bottom-right concentric ring accents (matches blog OG) */}
        <div
          style={{
            position: "absolute",
            bottom: "-180px",
            right: "-180px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            border: "48px solid rgba(253,181,23,0.10)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-260px",
            right: "-260px",
            width: "640px",
            height: "640px",
            borderRadius: "50%",
            border: "40px solid rgba(253,181,23,0.06)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-330px",
            right: "-330px",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            border: "32px solid rgba(48,162,255,0.05)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: "56px 80px 52px",
          }}
        >
          {/* Hexagon mark + Model Recipes wordmark (engine-neutral) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="46" height="46" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="og-mark" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <polygon points="16,1.5 28.4,8.75 28.4,23.25 16,30.5 3.6,23.25 3.6,8.75" stroke="url(#og-mark)" strokeWidth="2.5" strokeLinejoin="round" />
              <polygon points="16,10.5 20.76,13.25 20.76,18.75 16,21.5 11.24,18.75 11.24,13.25" fill="url(#og-mark)" />
            </svg>
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                display: "flex",
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 400 }}>Model&nbsp;</span>
              <span style={{ color: "#111827" }}>Recipes</span>
            </span>
          </div>

          {/* Title + subtitle + meta */}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
            <div
              style={{
                display: "flex",
                color: "#111827",
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontSize: 26,
                  color: "#30a2ff",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {subtitle}
              </div>
            )}
            {meta && (
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  fontSize: 20,
                  color: "#4b5563",
                  fontWeight: 500,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                }}
              >
                {meta}
              </div>
            )}
          </div>

          {/* Footer — version pill or CTA on the left, full URL on the right */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {version ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  border: "1px solid rgba(48,162,255,0.35)",
                  borderRadius: 999,
                  color: "#30a2ff",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                  letterSpacing: "-0.01em",
                }}
              >
                {version}
              </div>
            ) : cta ? (
              <div
                style={{
                  display: "flex",
                  color: "#30a2ff",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {cta}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
            <div
              style={{
                display: "flex",
                color: "#9ca3af",
                fontSize: 16,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              }}
            >
              {`recipes.vllm.ai${path}`}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
