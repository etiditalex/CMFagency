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
        className={`inline-flex items-center gap-1 rounded-md border border-brand/30 px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-muted ${className}`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Leave link"}
      </button>
    );
  }

  return (
    <div className={`rounded-lg border border-brand/30 bg-brand-muted/60 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Link2 className="w-4 h-4 text-brand mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-brand-dark">Employee leave application link</p>
          <p className="text-xs text-brand-dark/80 mt-0.5">
            {employeeName
              ? `Send this link to ${employeeName} so they can apply for leave with their details filled in automatically.`
              : "Send this personal link so the employee can apply for leave with their details filled in automatically."}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-surface px-3 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-muted"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Link copied" : "Copy leave application link"}
          </button>
        </div>
      </div>
    </div>
  );
}
