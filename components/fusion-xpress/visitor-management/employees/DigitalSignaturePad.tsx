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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const drewRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const disabledRef = useRef(disabled);
  const [hasInk, setHasInk] = useState(Boolean(value));

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const prepareContext = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        prepareContext(ctx);
      }
    }
  }, [prepareContext]);

  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  const pointFromClient = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const exportSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const drawTo = useCallback((point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const last = lastPointRef.current;
    if (!canvas || !ctx || !last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    drewRef.current = true;
    setHasInk(true);
  }, []);

  const startStroke = useCallback((point: { x: number; y: number }) => {
    if (disabledRef.current) return;
    drawingRef.current = true;
    drewRef.current = false;
    lastPointRef.current = point;
  }, []);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (drewRef.current) {
      drewRef.current = false;
      exportSignature();
    }
  }, [exportSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      const point = pointFromClient(e.clientX, e.clientY);
      if (!point) return;
      canvas.setPointerCapture(e.pointerId);
      startStroke(point);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current || disabledRef.current) return;
      e.preventDefault();
      const point = pointFromClient(e.clientX, e.clientY);
      if (!point) return;
      drawTo(point);
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      finishStroke();
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("pointerleave", onPointerEnd);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("pointerleave", onPointerEnd);
    };
  }, [drawTo, finishStroke, pointFromClient, startStroke]);

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
        ref={containerRef}
        className={`relative rounded-md border-2 border-dashed bg-white overflow-hidden ${
          disabled ? "border-gray-200 opacity-60" : "border-gray-300"
        }`}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-32 touch-none cursor-crosshair"
          style={{ touchAction: "none" }}
          aria-label="Draw your signature"
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
