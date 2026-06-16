"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, MessageCircle, Sparkles } from "lucide-react";

type QrChannel = "whatsapp" | "website" | "linkedin" | "tiktok" | "custom";

const CHANNEL_OPTIONS: { value: QrChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website Link" },
  { value: "linkedin", label: "LinkedIn Profile Link" },
  { value: "tiktok", label: "TikTok Link" },
  { value: "custom", label: "Custom URL" },
];

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function makeWhatsappPayload(phoneRaw: string, messageRaw: string) {
  const digits = phoneRaw.replace(/[^\d]/g, "");
  if (!digits) return "";
  const encodedMessage = messageRaw.trim() ? `?text=${encodeURIComponent(messageRaw.trim())}` : "";
  return `https://wa.me/${digits}${encodedMessage}`;
}

export default function FxQrCodeGeneratorPage() {
  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const [channel, setChannel] = useState<QrChannel>("whatsapp");
  const [label, setLabel] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [generatedPayload, setGeneratedPayload] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const livePayload = useMemo(() => {
    if (channel === "whatsapp") return makeWhatsappPayload(phoneNumber, whatsappMessage);
    return normalizeUrl(destinationUrl);
  }, [channel, destinationUrl, phoneNumber, whatsappMessage]);

  const downloadablePayload = generatedPayload || livePayload;

  async function handleGenerate() {
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/fusion-xpress/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          label,
          phoneNumber,
          whatsappMessage,
          destinationUrl,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string; qrCode?: { qr_payload?: string } }
        | null;

      if (!response.ok || !result?.qrCode?.qr_payload) {
        throw new Error(result?.error || "Unable to generate QR code.");
      }

      setGeneratedPayload(result.qrCode.qr_payload);
      setFeedback({ type: "success", message: "QR code generated and saved successfully." });
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to generate QR code.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownloadPng() {
    if (!downloadablePayload || !qrWrapRef.current) {
      setFeedback({ type: "error", message: "Generate a valid QR code before downloading." });
      return;
    }

    const svg = qrWrapRef.current.querySelector("svg");
    if (!svg) {
      setFeedback({ type: "error", message: "Could not prepare QR code download." });
      return;
    }

    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        setFeedback({ type: "error", message: "Download failed. Please try again." });
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          setFeedback({ type: "error", message: "Download failed. Please try again." });
          return;
        }
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `fx-qr-code-${channel}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setFeedback({ type: "error", message: "Download failed. Please try again." });
    };

    img.src = url;
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="relative mt-16 w-full overflow-hidden sm:mt-20 md:mt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="relative container-custom py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-200">Fusion Xpress</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              FX QR Code Generator
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-white/90 sm:text-base md:text-lg">
              Generate high-quality QR codes for WhatsApp, website links, LinkedIn profiles, TikTok pages, and other
              external links while keeping your Fusion Xpress design standard consistent.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-12 sm:py-16 md:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">Create your QR code</h2>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">QR type</span>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as QrChannel)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Label (optional)</span>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Campaign, profile name, or department"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </label>

                {channel === "whatsapp" ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">WhatsApp number</span>
                      <input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 254712345678"
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">Prefilled message (optional)</span>
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        rows={3}
                        placeholder="Hi, I would like to know more about your services."
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    </label>
                  </>
                ) : (
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Destination URL</span>
                    <input
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      placeholder="https://example.com/your-profile"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isSaving}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-secondary-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-secondary-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Generating..." : "Generate QR Code"}
                </button>

                {feedback ? (
                  <p
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      feedback.type === "success"
                        ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                        : "bg-red-50 text-red-700 ring-1 ring-red-200"
                    }`}
                  >
                    {feedback.message}
                  </p>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700">
                  {channel === "whatsapp" ? <MessageCircle className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">Preview</h2>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                <div ref={qrWrapRef} className="mx-auto flex w-full max-w-xs justify-center rounded-xl bg-white p-4 shadow-sm">
                  {generatedPayload ? (
                    <QRCodeSVG value={generatedPayload} size={240} level="M" includeMargin />
                  ) : livePayload ? (
                    <QRCodeSVG value={livePayload} size={240} level="M" includeMargin />
                  ) : (
                    <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-500">
                      Enter details to preview your QR code
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 ring-1 ring-gray-200">
                  <p className="font-semibold text-gray-800">Payload</p>
                  <p className="mt-1 break-all">{generatedPayload || livePayload || "No payload yet."}</p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!downloadablePayload}
                  className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-primary-300 bg-white px-4 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download QR (PNG)
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                This page follows the Fusion Xpress visual standards used on Smart Management system pages, while
                supporting externally accepted QR link patterns for WhatsApp and social/profile destinations.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
