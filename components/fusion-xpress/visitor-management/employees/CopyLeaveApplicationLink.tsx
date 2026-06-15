"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import { employeeLeaveApplicationUrl } from "@/lib/employees/leave-application";

type CopyLeaveApplicationLinkProps = {
  token: string;
  employeeName?: string;
  className?: string;
  compact?: boolean;
};

export default function CopyLeaveApplicationLink({
  token,
  employeeName,
  className = "",
  compact = false,
}: CopyLeaveApplicationLinkProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    const url = employeeLeaveApplicationUrl(
      token,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this leave application link:", url);
    }
  }, [token]);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void copyLink()}
        className={`inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50 ${className}`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Leave link"}
      </button>
    );
  }

  return (
    <div className={`rounded-lg border border-violet-200 bg-violet-50/60 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Link2 className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-violet-950">Employee leave application link</p>
          <p className="text-xs text-violet-900/80 mt-0.5">
            {employeeName
              ? `Send this link to ${employeeName} so they can apply for leave with their details filled in automatically.`
              : "Send this personal link so the employee can apply for leave with their details filled in automatically."}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Link copied" : "Copy leave application link"}
          </button>
        </div>
      </div>
    </div>
  );
}
