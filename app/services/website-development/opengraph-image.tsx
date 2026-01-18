import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0b1220 0%, #1d4ed8 45%, #059669 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                color: "rgba(255,255,255,0.9)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.9)",
                }}
              />
              WEBSITE DEVELOPMENT
            </div>
            <div style={{ color: "white", fontSize: 72, fontWeight: 900, lineHeight: 1.05 }}>
              Website Development &amp; Design
            </div>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 30, lineHeight: 1.35 }}>
              Custom, responsive, SEO-friendly websites built to perform — with ongoing maintenance
              and support.
            </div>
          </div>

          <div
            style={{
              width: 170,
              height: 170,
              borderRadius: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.12)",
              border: "6px solid rgba(255,255,255,0.22)",
              color: "white",
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: -3,
            }}
          >
            CF
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: 700 }}>
            cmfagency.co.ke
          </div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 22 }}>
            Changer Fusions
          </div>
        </div>
      </div>
    ),
    size
  );
}

