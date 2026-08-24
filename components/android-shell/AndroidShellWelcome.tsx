"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FusionXpressMark from "@/components/android-shell/FusionXpressMark";
import {
  ANDROID_SHELL_HOME_PATH,
  ANDROID_SHELL_LEARN_MORE_PATH,
  androidShellHref,
} from "@/lib/android-shell";

export default function AndroidShellWelcome() {
  return (
    <AndroidShellFrame>
      <div className="flex min-h-[100dvh] flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-12">
        <div className="flex items-center gap-3">
          <FusionXpressMark size={44} />
          <div>
            <p className="text-[15px] font-bold tracking-wide text-fx-ink">FUSION XPRESS</p>
            <p className="text-[12px] text-fx-muted">By CMF Agency</p>
          </div>
        </div>

        <h1 className="mt-16 text-[34px] font-bold leading-[1.12] tracking-tight text-fx-ink">
          Fast.
          <br />
          Smart.
          <br />
          Connected.
        </h1>
        <p className="mt-5 max-w-[20rem] text-[14px] leading-relaxed text-fx-muted">
          Fusion Xpress is your all-in-one solution for seamless digital experiences, built for speed,
          reliability, and results.
        </p>

        <div className="mt-auto flex gap-3 pt-10">
          <Link
            href={ANDROID_SHELL_HOME_PATH}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#9B4DFF] to-fx-accent text-[14px] font-bold text-white"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={androidShellHref(ANDROID_SHELL_LEARN_MORE_PATH)}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-black/10 bg-white text-[14px] font-semibold text-fx-ink"
          >
            Learn More
          </Link>
        </div>
      </div>
    </AndroidShellFrame>
  );
}
