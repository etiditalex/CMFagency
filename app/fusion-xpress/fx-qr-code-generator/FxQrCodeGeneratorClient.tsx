"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Globe, Linkedin, List, MessageCircle, Music2 } from "lucide-react";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

type QrChannel = "whatsapp" | "website" | "linkedin" | "tiktok" | "custom";

const CHANNEL_OPTIONS: { value: QrChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website Link" },
  { value: "linkedin", label: "LinkedIn Profile Link" },
  { value: "tiktok", label: "TikTok Link" },
  { value: "custom", label: "Custom URL" },
];

const TYPE_CARD_META: Record<
  QrChannel,
  { title: string; subtitle: string; icon: typeof Globe }
> = {
  website: { title: "Website", subtitle: "Link to any website URL", icon: Globe },
  whatsapp: { title: "WhatsApp", subtitle: "Open direct chat instantly", icon: MessageCircle },
  linkedin: { title: "LinkedIn", subtitle: "Share your profile link", icon: Linkedin },
  tiktok: { title: "TikTok", subtitle: "Share your TikTok page", icon: Music2 },
  custom: { title: "Custom", subtitle: "Use any external URL", icon: List },
};

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

export default function FxQrCodeGeneratorClient() {
  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const [channel, setChannel] = useState<QrChannel>("whatsapp");
  const [label, setLabel] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [fgColor, setFgColor] = useState("#111827");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [qrSize, setQrSize] = useState(240);
  const [generatedPayload, setGeneratedPayload] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const livePayload = useMemo(() => {
    if (channel === "whatsapp") return makeWhatsappPayload(phoneNumber, whatsappMessage);
    return normalizeUrl(destinationUrl);
  }, [channel, destinationUrl, phoneNumber, whatsappMessage]);

  const downloadablePayload = generatedPayload || livePayload;
  const previewPayload = generatedPayload;

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

      context.fillStyle = bgColor;
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
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-gray-200 bg-[#f7f7f8]">
        <div className="flex w-full items-center gap-3 px-3 py-2 sm:px-5 lg:px-8">
          <div className="flex shrink-0 items-center gap-4 sm:gap-6 lg:gap-[55px]">
            <Image
              src={BRAND_LOGO_URL}
              alt="CMF Agency logo"
              width={385}
              height={105}
              className="h-14 w-auto object-contain sm:h-20 lg:h-[105px]"
              priority
            />
            <div className="hidden leading-tight text-gray-900 sm:block">
              <div className="text-sm font-extrabold tracking-wide sm:text-lg lg:text-xl">FX QR CODE</div>
              <div className="text-sm font-extrabold tracking-wide sm:text-lg lg:text-xl">GENERATOR</div>
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 items-center justify-start gap-[30px] pl-4 text-sm font-semibold text-gray-600 lg:flex">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Select QR type</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">2</span>
              <span>Add content</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-xs font-bold text-white">3</span>
              <span>Design QR code</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-xs font-bold text-white">4</span>
              <span>Download QR code</span>
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-0 py-0">
        <h1 className="sr-only">FX QR Code Generator - WhatsApp, Website, LinkedIn and TikTok QR Codes</h1>
        <div className="w-full bg-[#f4f6f8] px-3 py-4 sm:px-6 lg:px-10">
          <div className="grid w-full grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[1.55fr_0.45fr]">
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
              <section>
                <div className="mb-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                  Choose a QR Type
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CHANNEL_OPTIONS.map((option) => {
                    const meta = TYPE_CARD_META[option.value];
                    const Icon = meta.icon;
                    const active = channel === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setChannel(option.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-primary-500 bg-primary-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-base font-extrabold text-gray-900">{meta.title}</p>
                        <p className="mt-1 text-sm text-gray-500">{meta.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-gray-500">Add Content</h2>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Label (optional)</span>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Campaign, profile name, or department"
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
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
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Prefilled message (optional)</span>
                        <textarea
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          rows={3}
                          placeholder="Hi, I would like to know more about your services."
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
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
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    </label>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-gray-500">Design QR Code</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Foreground</span>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-gray-300 bg-white p-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Background</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-gray-300 bg-white p-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Size ({qrSize}px)</span>
                    <input
                      type="range"
                      min={180}
                      max={320}
                      step={10}
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                      className="mt-3 w-full accent-primary-600"
                    />
                  </label>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isSaving}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Generating..." : "Generate QR Code"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!downloadablePayload}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-secondary-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-secondary-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download QR (PNG)
                </button>
              </div>

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

            <aside className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
              <div className="mx-auto w-full max-w-[300px] rounded-[40px] border-4 border-gray-900 bg-[#eceff3] p-3 shadow-sm">
                <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-gray-900/85" />
                <div className="overflow-hidden rounded-[26px] border border-gray-300 bg-white">
                  <div className="bg-gradient-to-b from-secondary-500 to-secondary-600 px-4 pb-14 pt-5">
                    <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-2 text-[11px] font-semibold text-white">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{previewPayload || "https://cmfagency.co.ke/fusion-xpress"}</span>
                    </div>
                  </div>

                  <div className="-mt-10 rounded-t-3xl bg-[#f3f4f6] px-4 pb-5 pt-4">
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div
                        ref={qrWrapRef}
                        className="mx-auto flex min-h-[215px] items-center justify-center rounded-md bg-gray-100"
                        style={{ backgroundColor: previewPayload ? bgColor : "#d1d5db" }}
                      >
                        {previewPayload ? (
                          <QRCodeSVG
                            value={previewPayload}
                            size={Math.min(qrSize, 185)}
                            level="M"
                            includeMargin
                            fgColor={fgColor}
                            bgColor={bgColor}
                          />
                        ) : (
                          <div className="h-[170px] w-[165px] rounded-md bg-gray-300" />
                        )}
                      </div>
                      <div className="mx-auto mt-5 h-4 w-4/5 rounded-full bg-gray-200" />
                    </div>
                    <div className="mx-auto mt-5 h-2.5 w-4/5 rounded-full bg-gray-300" />
                  </div>
                </div>
                <div className="mx-auto mt-3 h-2 w-[72%] rounded-full bg-black" />
              </div>

              <div className="mt-4 rounded-xl bg-white p-3 text-xs text-gray-700 ring-1 ring-gray-200">
                <p className="font-semibold text-gray-800">Payload</p>
                <p className="mt-1 break-all">{downloadablePayload || "No payload yet."}</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
