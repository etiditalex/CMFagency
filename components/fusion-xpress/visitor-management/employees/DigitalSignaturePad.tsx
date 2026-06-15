"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DigitalSignaturePadProps = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
};

export default function DigitalSignaturePad({
  value,
  onChange,
  disabled = false,
  className = "",
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const drewRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#111827";
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const exportSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const point = pointFromEvent(e);
    if (!point) return;
    drawingRef.current = true;
    drewRef.current = false;
    lastPointRef.current = point;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointFromEvent(e);
    const last = lastPointRef.current;
    if (!canvas || !ctx || !point || !last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    drewRef.current = true;
    if (!hasInk) setHasInk(true);
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drewRef.current) {
      drewRef.current = false;
      exportSignature();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.width;
    resizeCanvas();
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className={className}>
      <div
        className={`relative rounded-md border-2 border-dashed bg-white overflow-hidden ${
          disabled ? "border-gray-200 opacity-60" : "border-gray-300"
        }`}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-28 touch-none cursor-crosshair"
          aria-label="Draw your signature"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        />
        {!hasInk ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Sign here with finger or mouse
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">Applicant&apos;s signature</p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="text-xs font-semibold text-primary-700 hover:underline disabled:opacity-40"
        >
          Clear signature
        </button>
      </div>
    </div>
  );
}
