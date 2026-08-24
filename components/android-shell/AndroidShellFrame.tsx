"use client";

import { useEffect } from "react";

import BottomNav from "@/components/fusion-xpress/app-ui/BottomNav";

type Props = {
  children: React.ReactNode;
  nav?: boolean;
  tone?: "dark" | "light";
  unreadCount?: number;
};

export default function AndroidShellFrame({
  children,
  nav = false,
  tone = "light",
  unreadCount = 0,
}: Props) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/android-shell-sw.js", { scope: "/app" }).catch(() => undefined);
  }, []);

  return (
    <div className={tone === "dark" ? "min-h-[100dvh] bg-[#1A1033]" : "min-h-[100dvh] bg-fx-canvas"}>
      <div
        className={`relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden font-sans sm:shadow-[0_24px_80px_rgba(26,26,46,0.18)] ${
          tone === "dark" ? "bg-[#1A1033]" : "bg-fx-canvas"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {nav ? <BottomNav unreadCount={unreadCount} /> : null}
      </div>
    </div>
  );
}
