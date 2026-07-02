"use client";

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Share2 } from "lucide-react";

import {
  FX_QR_BACKLINK_OUTREACH_TIPS,
  FX_QR_DIRECTORY_SUBMISSIONS,
  FX_QR_GENERATOR_SHARE_TEXT,
  buildFxQrSocialShareUrls,
  fxQrGeneratorCitationHtml,
  fxQrGeneratorCitationMarkdown,
} from "@/lib/fx-qr-code-generator-backlinks";
import { FX_QR_GENERATOR_URL } from "@/lib/fx-qr-code-generator-seo";

type CopyKey = "url" | "html" | "markdown";

const COPY_LABELS: Record<CopyKey, string> = {
  url: "Page link",
  html: "HTML citation",
  markdown: "Markdown link",
};

function copyValue(key: CopyKey): string {
  if (key === "url") return FX_QR_GENERATOR_URL;
  if (key === "html") return fxQrGeneratorCitationHtml();
  return fxQrGeneratorCitationMarkdown();
}

export default function FxQrCodeGeneratorSharePanel({
  variant = "public",
}: {
  variant?: "public" | "dashboard";
}) {
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const social = buildFxQrSocialShareUrls();

  const handleCopy = useCallback(async (key: CopyKey) => {
    try {
      await navigator.clipboard.writeText(copyValue(key));
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, []);

  const isDashboard = variant === "dashboard";
  const sectionClass = isDashboard
    ? "rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
    : "mt-6 rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.03),0_24px_64px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:p-7";

  return (
    <section aria-labelledby="fx-qr-share-heading" className={sectionClass}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDashboard ? "bg-primary-100 text-primary-700" : "bg-primary-100 text-primary-700"}`}>
          <Share2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="fx-qr-share-heading" className={`font-extrabold tracking-tight text-slate-900 ${isDashboard ? "text-lg" : "text-lg sm:text-xl"}`}>
            Share this tool &amp; build backlinks
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {FX_QR_GENERATOR_SHARE_TEXT} Copy the citation snippets below for blog posts, partner sites, and directories.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(COPY_LABELS) as CopyKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => void handleCopy(key)}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary-300 hover:bg-white"
          >
            <span className="inline-flex items-center gap-2">
              {copiedKey === key ? (
                <Check className="h-4 w-4 text-secondary-600" />
              ) : (
                <Copy className="h-4 w-4 text-slate-500" />
              )}
              Copy {COPY_LABELS[key]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 font-mono text-xs text-slate-700 break-all">
        {fxQrGeneratorCitationHtml()}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary-300"
        >
          <Link2 className="h-4 w-4" />
          Share on LinkedIn
        </a>
        <a
          href={social.x}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary-300"
        >
          <Link2 className="h-4 w-4" />
          Share on X
        </a>
        <a
          href={social.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary-300"
        >
          <Link2 className="h-4 w-4" />
          Share on WhatsApp
        </a>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            Submit to directories
          </h3>
          <ul className="mt-3 space-y-3">
            {FX_QR_DIRECTORY_SUBMISSIONS.map((item) => (
              <li
                key={item.name}
                className="rounded-[18px] border border-white/80 bg-white/75 p-3 text-sm shadow-sm"
              >
                <p className="font-bold text-slate-900">{item.name}</p>
                <p className="mt-1 leading-relaxed text-slate-600">{item.action}</p>
                {"href" in item && item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                  >
                    Open
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            Outreach that earns links
          </h3>
          <ul className="mt-3 space-y-3">
            {FX_QR_BACKLINK_OUTREACH_TIPS.map((tip) => (
              <li
                key={tip}
                className="rounded-[18px] border border-white/80 bg-white/75 p-3 text-sm leading-relaxed text-slate-600 shadow-sm"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
