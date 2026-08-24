"use client";

import Link from "next/link";
import { Bell, CircleHelp, CreditCard, FileText, Info, Settings, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import MenuRow from "@/components/fusion-xpress/app-ui/MenuRow";
import {
  ANDROID_SHELL_INBOX_PATH,
  ANDROID_SHELL_LEARN_MORE_PATH,
  androidShellHref,
  visitorSignInHref,
} from "@/lib/android-shell";
import {
  VISITOR_MANAGEMENT_DOCS_PATH,
  VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
} from "@/lib/visitors/industry-options";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

const MENU = [
  { href: "/dashboard/account", label: "Account Settings", icon: Settings },
  { href: "/dashboard/invoices", label: "My Invoices", icon: FileText },
  { href: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH, label: "Payment Methods", icon: CreditCard },
  { href: ANDROID_SHELL_INBOX_PATH, label: "Notifications", icon: Bell, internal: true },
  { href: VISITOR_MANAGEMENT_DOCS_PATH, label: "Help & Support", icon: CircleHelp },
  { href: ANDROID_SHELL_LEARN_MORE_PATH, label: "About Fusion Xpress", icon: Info },
] as const;

export default function AndroidShellProfile() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { role, isPortalMember, tier } = usePortal();

  const displayName = user?.name || "Guest";
  const roleLabel = isPortalMember
    ? role === "admin"
      ? "Admin"
      : role === "manager"
        ? "Manager"
        : role === "employer"
          ? "Employer"
          : "Client"
    : "Visitor";
  const showPremium = isPortalMember && (tier === "pro" || tier === "enterprise" || role === "admin");

  const onLogout = async () => {
    await logout();
    router.replace("/app");
  };

  return (
    <AndroidShellFrame nav>
      <div className="relative bg-gradient-to-br from-[#4B1FA8] via-[#6B2FE0] to-[#7B2FF7] px-5 pb-14 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white text-xl font-bold text-fx-accent">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white">{displayName}</h1>
              <p className="text-[13px] text-white/80">{roleLabel}</p>
              {showPremium ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  <Star className="h-3 w-3 fill-white" />
                  Premium
                </span>
              ) : !isAuthenticated ? (
                <Link
                  href={visitorSignInHref("/app/profile")}
                  className="mt-1 inline-block text-[12px] font-semibold text-white/85 underline"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
          <Link
            href={androidShellHref("/dashboard/account")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" strokeWidth={1.7} />
          </Link>
        </div>
      </div>

      <div className="relative -mt-8 flex-1 px-4 pb-6">
        <FxCard padded={false} className="divide-y divide-black/[0.04] px-3">
          {MENU.map((item) => (
            <MenuRow
              key={item.label}
              href={"internal" in item && item.internal ? item.href : androidShellHref(item.href)}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </FxCard>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center text-[15px] font-semibold text-red-500"
          >
            Log Out
          </button>
        ) : null}
      </div>
    </AndroidShellFrame>
  );
}
