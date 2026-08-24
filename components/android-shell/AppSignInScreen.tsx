"use client";

import Link from "next/link";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import VisitorSignInForm from "@/components/fusion-xpress/visitor-management/VisitorSignInForm";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import { ANDROID_SHELL_HOME_PATH } from "@/lib/android-shell";

export default function AppSignInScreen() {
  return (
    <AndroidShellFrame>
      <TopBar
        title="Sign in"
        subtitle="Access Employees and Visitor Management in this app."
        right={
          <Link
            href={ANDROID_SHELL_HOME_PATH}
            className="mt-1 text-[13px] font-semibold text-fx-accent"
          >
            Home
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <VisitorSignInForm />
      </div>
    </AndroidShellFrame>
  );
}
