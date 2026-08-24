"use client";

import Link from "next/link";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FusionXpressMark from "@/components/android-shell/FusionXpressMark";
import {
  ANDROID_SHELL_HOME_PATH,
  ANDROID_SHELL_WELCOME_PATH,
  visitorSignInHref,
} from "@/lib/android-shell";
import { useAuth } from "@/contexts/AuthContext";

export default function AndroidShellSplash() {
  const { isAuthenticated, loading } = useAuth();
  const startHref = !loading && isAuthenticated ? ANDROID_SHELL_HOME_PATH : ANDROID_SHELL_WELCOME_PATH;

  return (
    <AndroidShellFrame tone="dark">
      <div className="relative flex min-h-[100dvh] flex-col px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#3B0A7A] via-[#2A1464] to-[#12081F]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(ellipse_at_top,rgba(123,47,247,0.45),transparent_55%)]" />

        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <FusionXpressMark size={112} />
          <h1 className="mt-4 text-[22px] font-bold tracking-[0.14em] text-white">FUSION XPRESS</h1>
          <p className="mt-3 max-w-[16.5rem] text-[14px] leading-relaxed text-white/85">
            Powering Possibilities. Delivering Results.
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center justify-center gap-2" aria-hidden>
            <span className="h-1.5 w-6 rounded-full bg-gradient-to-r from-orange-400 to-fx-accent" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
          </div>
          <Link
            href={startHref}
            className="flex min-h-[54px] items-center justify-center rounded-full bg-white text-[16px] font-bold text-fx-ink"
          >
            Get Started
          </Link>
          <Link
            href={visitorSignInHref(ANDROID_SHELL_HOME_PATH)}
            className="flex min-h-[44px] items-center justify-center text-[14px] font-medium text-white"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </AndroidShellFrame>
  );
}
