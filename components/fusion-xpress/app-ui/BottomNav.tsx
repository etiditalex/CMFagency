"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FolderKanban, Home, MessageCircle, UserRound } from "lucide-react";

import {
  ANDROID_SHELL_ACTIVITY_PATH,
  ANDROID_SHELL_HOME_PATH,
  ANDROID_SHELL_INBOX_PATH,
  ANDROID_SHELL_PROFILE_PATH,
} from "@/lib/android-shell";

const TABS = [
  { href: ANDROID_SHELL_HOME_PATH, label: "Home", icon: Home },
  { href: ANDROID_SHELL_ACTIVITY_PATH, label: "Projects", icon: FolderKanban },
  { href: ANDROID_SHELL_INBOX_PATH, label: "Messages", icon: MessageCircle },
  { href: ANDROID_SHELL_PROFILE_PATH, label: "Profile", icon: UserRound },
] as const;

export default function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-black/[0.04] bg-white px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5"
      aria-label="App"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === ANDROID_SHELL_HOME_PATH
              ? pathname === tab.href || Boolean(pathname?.startsWith("/app/employees"))
              : pathname === tab.href;
          const Icon = tab.icon;
          const showBadge = tab.href === ANDROID_SHELL_INBOX_PATH && unreadCount > 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? "font-semibold text-fx-accent" : "font-medium text-fx-inactive"
                }`}
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    active ? "bg-fx-accentSoft" : ""
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.7} />
                  {showBadge ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
