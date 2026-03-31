"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Mail, X } from "lucide-react";
import {
  buildFacebookSharerUrl,
  buildMailtoShareUrl,
} from "@/lib/blog-share-links";

type Props = {
  children: ReactNode;
  className?: string;
  pageUrl: string;
  pageTitle: string;
};

export default function BlogBodyWithDoubleClickShare({
  children,
  className,
  pageUrl,
  pageTitle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ left: 0, top: 0 });
  const [snippet, setSnippet] = useState("");
  const [igNote, setIgNote] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setIgNote(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent) => {
      const node = popupRef.current;
      if (node && !node.contains(e.target as Node)) close();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  const handleDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [role='button'], input, textarea, select, iframe, video, audio")) {
        return;
      }

      window.setTimeout(() => {
        const raw = window.getSelection()?.toString() ?? "";
        const text = raw.replace(/\s+/g, " ").trim();
        if (!text) return;

        const w = 260;
        const h = 200;
        let left = e.clientX - w / 2;
        let top = e.clientY + 16;
        left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - h - 10));
        setSnippet(text.slice(0, 2000));
        setBox({ left, top });
        setIgNote(null);
        setOpen(true);
      }, 0);
    },
    []
  );

  const shareBody = snippet
    ? `${snippet}\n\n—\n${pageTitle}\n${pageUrl}`
    : `${pageTitle}\n${pageUrl}`;

  const mailto = buildMailtoShareUrl(
    `Quote: ${pageTitle}`.slice(0, 250),
    shareBody.slice(0, 8000)
  );

  const onInstagram = async () => {
    const clip = `${snippet ? `${snippet}\n\n` : ""}${pageUrl}`;
    try {
      await navigator.clipboard.writeText(clip);
      setIgNote("Copied — paste into Instagram");
    } catch {
      setIgNote("Copy blocked — select the text and copy manually");
    }
  };

  return (
    <>
      <div className={className} onDoubleClick={handleDoubleClick}>
        {children}
      </div>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Share selected text"
          className="fixed z-[60] w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
          style={{ left: box.left, top: box.top }}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">Share</p>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 max-h-16 overflow-y-auto text-xs leading-snug text-gray-600">&ldquo;{snippet.slice(0, 220)}
            {snippet.length > 220 ? "…" : ""}&rdquo;</p>

          <div className="flex flex-col gap-2">
            <a
              href={buildFacebookSharerUrl(pageUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2] py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Facebook
            </a>
            <button
              type="button"
              onClick={onInstagram}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Instagram
            </button>
            <a
              href={mailto}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          </div>
          {igNote && <p className="mt-2 text-center text-xs text-gray-600">{igNote}</p>}
        </div>
      )}
    </>
  );
}
