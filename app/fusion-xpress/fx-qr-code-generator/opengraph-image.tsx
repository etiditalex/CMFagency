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
          background: "linear-gradient(135deg, #0f172a 0%, #1e58ca 42%, #2ca57c 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 860 }}>
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
              FUSION XPRESS
            </div>
            <div style={{ color: "white", fontSize: 68, fontWeight: 900, lineHeight: 1.05 }}>
              Free QR Code Generator
            </div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 30, lineHeight: 1.35 }}>
              WhatsApp, websites, LinkedIn, TikTok & custom links — customize, preview, and download PNG.
            </div>
          </div>

          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.14)",
              border: "6px solid rgba(255,255,255,0.22)",
              color: "white",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            QR
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: 700 }}>
            cmfagency.co.ke
          </div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 22 }}>Changer Fusions Kenya</div>
        </div>
      </div>
    ),
    size
  );
}
