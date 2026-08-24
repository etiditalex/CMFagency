"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { ANDROID_SHELL_INBOX_PATH } from "@/lib/android-shell";

type Props = {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  right?: React.ReactNode;
};

export default function TopBar({ title, subtitle, unreadCount = 0, right }: Props) {
  return (
    <header className="px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-fx-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13px] text-fx-muted">{subtitle}</p> : null}
        </div>
        {right ?? (
          <Link
            href={ANDROID_SHELL_INBOX_PATH}
            className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-fx-ink" strokeWidth={1.8} />
            {unreadCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        )}
      </div>
    </header>
  );
}
