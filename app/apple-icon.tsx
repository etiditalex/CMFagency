import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  // Deterministic (no remote fetch) to avoid flaky builds/runtime.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #059669 100%)",
        }}
      >
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.14)",
            border: "3px solid rgba(255,255,255,0.26)",
            color: "white",
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -3,
          }}
        >
          CF
        </div>
      </div>
    ),
    size
  );
}

