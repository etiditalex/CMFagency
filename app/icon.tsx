import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  // Keep this icon generation deterministic (no remote fetch) to avoid flaky builds/runtime.
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
            width: 380,
            height: 380,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.12)",
            border: "6px solid rgba(255,255,255,0.25)",
            color: "white",
            fontSize: 180,
            fontWeight: 800,
            letterSpacing: -8,
          }}
        >
          CF
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
