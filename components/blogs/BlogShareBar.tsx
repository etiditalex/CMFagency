import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import {
  buildFacebookSharerUrl,
  buildLinkedInShareUrl,
  buildMessengerShareUrl,
  buildTwitterIntentUrl,
} from "@/lib/blog-share-links";

type Props = {
  url: string;
  title: string;
};

function FacebookIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.107c0 3.584 1.848 6.749 4.69 8.797L3.983 24l4.759-2.59c1.33.368 2.74.57 4.258.57 6.627 0 12-4.974 12-11.107C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.26-5.963 3.26 6.559-6.963 3.13 3.26 5.889-3.26-6.56 6.963z" />
    </svg>
  );
}

function PillButton({
  href,
  label,
  bgClass,
  icon,
}: {
  href: string;
  label: string;
  bgClass: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[2.5rem] items-center gap-0 rounded-full pl-3 pr-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${bgClass}`}
    >
      <span className="flex items-center justify-center py-1">{icon}</span>
      <span className="mx-2 h-5 w-px shrink-0 bg-white/35" aria-hidden />
      <span className="pr-0.5">{label}</span>
    </a>
  );
}

export default function BlogShareBar({ url, title }: Props) {
  const tweetText = title.trim();
  const fb = buildFacebookSharerUrl(url);
  const tw = buildTwitterIntentUrl(url, tweetText);
  const li = buildLinkedInShareUrl(url);
  const ms = buildMessengerShareUrl(url);

  return (
    <div
      className="not-prose my-10 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      aria-label="Share this article"
    >
      <div className="flex items-center gap-2 text-gray-700">
        <Share2 className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
        <span className="text-base font-semibold">Share</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <PillButton href={fb} label="Facebook" bgClass="bg-[#1877F2]" icon={<FacebookIcon />} />
        <PillButton href={tw} label="X" bgClass="bg-black" icon={<XIcon />} />
        <PillButton href={li} label="LinkedIn" bgClass="bg-[#0A66C2]" icon={<LinkedInIcon />} />
        <PillButton href={ms} label="Messenger" bgClass="bg-[#0084FF]" icon={<MessengerIcon />} />
      </div>
    </div>
  );
}
