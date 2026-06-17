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
    const img = new window.Image();

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/95 via-gray-50 to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,rgba(59,121,218,0.14),transparent_55%),radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(44,165,124,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_100%,rgba(59,121,218,0.08),transparent_55%),radial-gradient(ellipse_55%_35%_at_100%_100%,rgba(44,165,124,0.1),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(248,250,252,0.2)_45%,rgba(255,255,255,0.65)_100%)]"
      />

      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/55 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex w-full items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-8">
          <div className="flex shrink-0 items-center gap-4 sm:gap-6 lg:gap-[55px]">
            <Image
              src={BRAND_LOGO_URL}
              alt="CMF Agency logo"
              width={385}
              height={105}
              className="h-14 w-auto object-contain drop-shadow-sm sm:h-20 lg:h-[105px]"
              priority
            />
            <div className="hidden leading-tight text-slate-900 sm:block">
              <div className="text-sm font-extrabold tracking-wide sm:text-lg lg:text-xl">FX QR CODE</div>
              <div className="text-sm font-extrabold tracking-wide sm:text-lg lg:text-xl">GENERATOR</div>
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 items-center justify-start gap-[30px] pl-4 text-sm font-semibold text-slate-600 lg:flex">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-secondary-200/50 bg-secondary-50/60 px-3 py-1.5 text-secondary-700 shadow-[0_2px_8px_rgba(44,165,124,0.08)] backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4 text-secondary-600" />
              <span>Select QR type</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/70 bg-white/50 px-3 py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-secondary-500 to-secondary-600 text-xs font-bold text-white shadow-[0_2px_6px_rgba(44,165,124,0.35)]">
                2
              </span>
              <span>Add content</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/70 bg-white/50 px-3 py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-xs font-bold text-white shadow-sm">
                3
              </span>
              <span>Design QR code</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/70 bg-white/50 px-3 py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-xs font-bold text-white shadow-sm">
                4
              </span>
              <span>Download QR code</span>
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full px-0 py-0">
        <h1 className="sr-only">FX QR Code Generator - WhatsApp, Website, LinkedIn and TikTok QR Codes</h1>
        <div className="w-full px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
          <div className="grid w-full grid-cols-1 gap-5 lg:gap-7 xl:grid-cols-[1.55fr_0.45fr]">
            <div className="space-y-6 rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.03),0_24px_64px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:space-y-7 sm:p-7">
              <section>
                <div className="mb-4 inline-flex rounded-full border border-secondary-200/60 bg-gradient-to-r from-secondary-50/90 via-emerald-50/70 to-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-secondary-700 shadow-[0_2px_10px_rgba(44,165,124,0.08)] backdrop-blur-sm">
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
                        className={`rounded-[22px] border p-4 text-left transition-all duration-300 ease-out ${
                          active
                            ? "border-primary-300/60 bg-gradient-to-br from-primary-50/95 via-white/90 to-white/70 shadow-[0_8px_28px_rgba(30,88,202,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-primary-200/50"
                            : "border-white/90 bg-white/70 shadow-[0_2px_10px_rgba(15,23,42,0.04)] backdrop-blur-sm hover:-translate-y-1 hover:border-primary-200/70 hover:bg-white/90 hover:shadow-[0_16px_40px_rgba(30,88,202,0.1)]"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                            active
                              ? "bg-gradient-to-br from-secondary-100 to-secondary-50 text-secondary-700"
                              : "bg-gradient-to-br from-secondary-50 to-white text-secondary-600"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-base font-extrabold text-slate-900">{meta.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[22px] bg-gradient-to-br from-white/85 via-slate-50/50 to-white/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-md sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Add Content</h2>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Label (optional)</span>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Campaign, profile name, or department"
                      className="mt-2 w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none backdrop-blur-sm transition focus:border-primary-400/60 focus:bg-white focus:ring-2 focus:ring-primary-200/50"
                    />
                  </label>

                  {channel === "whatsapp" ? (
                    <>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">WhatsApp number</span>
                        <input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. 254712345678"
                          className="mt-2 w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none backdrop-blur-sm transition focus:border-primary-400/60 focus:bg-white focus:ring-2 focus:ring-primary-200/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Prefilled message (optional)</span>
                        <textarea
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          rows={3}
                          placeholder="Hi, I would like to know more about your services."
                          className="mt-2 w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none backdrop-blur-sm transition focus:border-primary-400/60 focus:bg-white focus:ring-2 focus:ring-primary-200/50"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Destination URL</span>
                      <input
                        value={destinationUrl}
                        onChange={(e) => setDestinationUrl(e.target.value)}
                        placeholder="https://example.com/your-profile"
                        className="mt-2 w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none backdrop-blur-sm transition focus:border-primary-400/60 focus:bg-white focus:ring-2 focus:ring-primary-200/50"
                      />
                    </label>
                  )}
                </div>
              </section>

              <section className="rounded-[22px] bg-gradient-to-br from-white/85 via-slate-50/50 to-white/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-md sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Design QR Code</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Foreground</span>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-200/70 bg-white/90 p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Background</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-200/70 bg-white/90 p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Size ({qrSize}px)</span>
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
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-primary-500 to-primary-700 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(30,88,202,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:from-primary-600 hover:to-primary-800 hover:shadow-[0_8px_24px_rgba(30,88,202,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Generating..." : "Generate QR Code"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!downloadablePayload}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-secondary-500 to-secondary-700 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(44,165,124,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:from-secondary-600 hover:to-secondary-800 hover:shadow-[0_8px_24px_rgba(44,165,124,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download QR (PNG)
                </button>
              </div>

              {feedback ? (
                <p
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium backdrop-blur-sm ${
                    feedback.type === "success"
                      ? "border border-secondary-200/60 bg-secondary-50/80 text-secondary-800 shadow-[0_2px_12px_rgba(44,165,124,0.08)]"
                      : "border border-red-200/60 bg-red-50/80 text-red-700 shadow-[0_2px_12px_rgba(220,38,38,0.08)]"
                  }`}
                >
                  {feedback.message}
                </p>
              ) : null}
            </div>

            <aside className="rounded-[24px] border border-white/80 bg-white/50 p-4 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.03),0_24px_64px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:p-6">
              <div className="relative flex justify-center py-4 sm:py-6">
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,121,218,0.22)_0%,transparent_68%)] blur-3xl"
                />
                <div
                  aria-hidden
                  className="absolute left-1/2 top-[58%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(44,165,124,0.18)_0%,transparent_70%)] blur-2xl"
                />
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0%,transparent_75%)] blur-xl"
                />

                <div className="relative mx-auto w-full max-w-[300px] rounded-[44px] border-[3px] border-slate-800/90 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-[11px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.12)_inset,0_48px_96px_-24px_rgba(30,88,202,0.2)]">
                  <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-slate-950/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
                  <div className="overflow-hidden rounded-[28px] border border-slate-600/40 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <div className="bg-gradient-to-b from-secondary-500 via-secondary-600 to-secondary-700 px-4 pb-14 pt-5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-md">
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{previewPayload || "https://cmfagency.co.ke/fusion-xpress"}</span>
                      </div>
                    </div>

                    <div className="-mt-10 rounded-t-3xl bg-gradient-to-b from-slate-100/95 to-slate-200/80 px-4 pb-5 pt-4">
                      <div className="rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm">
                        <div
                          ref={qrWrapRef}
                          className="mx-auto flex min-h-[215px] items-center justify-center rounded-xl bg-gray-100 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]"
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
                            <div className="h-[170px] w-[165px] rounded-lg bg-gradient-to-br from-slate-300 to-slate-200" />
                          )}
                        </div>
                        <div className="mx-auto mt-5 h-4 w-4/5 rounded-full bg-gradient-to-r from-slate-200 to-slate-100" />
                      </div>
                      <div className="mx-auto mt-5 h-2.5 w-4/5 rounded-full bg-gradient-to-r from-slate-300 to-slate-200" />
                    </div>
                  </div>
                  <div className="mx-auto mt-3 h-2 w-[72%] rounded-full bg-gradient-to-b from-slate-700 to-slate-950 shadow-[0_2px_6px_rgba(0,0,0,0.3)]" />
                </div>
              </div>

              <div className="mt-2 rounded-[20px] border border-white/70 bg-white/75 p-3 text-xs text-slate-700 shadow-[0_2px_16px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
                <p className="font-semibold text-slate-800">Payload</p>
                <p className="mt-1 break-all">{downloadablePayload || "No payload yet."}</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
