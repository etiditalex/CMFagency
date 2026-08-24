import { SITE_URL } from "@/lib/site-url";
import { VISITOR_MANAGEMENT_PATH } from "@/lib/visitors/industry-options";

/** Play Store shell start page (TWA / Custom Tabs). */
export const ANDROID_SHELL_HUB_PATH = "/app";
export const ANDROID_SHELL_WELCOME_PATH = "/app/welcome";
export const ANDROID_SHELL_HOME_PATH = "/app/home";
export const ANDROID_SHELL_ACTIVITY_PATH = "/app/activity";
export const ANDROID_SHELL_INBOX_PATH = "/app/inbox";
export const ANDROID_SHELL_PROFILE_PATH = "/app/profile";
export const ANDROID_SHELL_EMPLOYEES_PATH = "/app/employees";
export const ANDROID_SHELL_SIGN_IN_PATH = "/app/sign-in";
export const ANDROID_SHELL_LEARN_MORE_PATH = "/fusion-xpress/smart-visitor-management";

export const ANDROID_SHELL_PACKAGE_NAME = "ke.co.cmfagency.shell";

export const ANDROID_SHELL_ORIGIN = SITE_URL;

export const VISITOR_SIGN_IN_PATH = "/fusion-xpress/smart-visitor-management/sign-in";

/** Public ticketing entry; campaign checkouts stay on /[slug] and /pay/[slug]. */
export const TICKETING_START_PATH = "/kcm/cfm-tickets";

export const VOTING_START_PATH = "/voting/all";

export type AndroidShellModule = {
  id: "visitor" | "employees" | "tickets" | "votes";
  title: string;
  description: string;
  href: string;
};

export const ANDROID_SHELL_MODULES: AndroidShellModule[] = [
  {
    id: "visitor",
    title: "Smart Visitor Management",
    description: "Sign in to your Fusion Xpress visitor dashboard.",
    href: VISITOR_SIGN_IN_PATH,
  },
  {
    id: "employees",
    title: "Employees",
    description: "QR, GPS, leave, kiosk, and attendance tools.",
    href: ANDROID_SHELL_EMPLOYEES_PATH,
  },
  {
    id: "tickets",
    title: "Ticketing",
    description: "Buy tickets on the live checkout pages.",
    href: TICKETING_START_PATH,
  },
  {
    id: "votes",
    title: "Voting",
    description: "Vote in live campaigns. Payment stays on the server.",
    href: VOTING_START_PATH,
  },
];

/** Path prefixes the Android shell may open on cmfagency.co.ke. Keep in sync with android-shell UrlPolicy. */
export const ANDROID_SHELL_ALLOWED_PATH_PREFIXES = [
  ANDROID_SHELL_HUB_PATH,
  "/fusion-xpress/smart-visitor-management",
  "/fusion-xpress/reset-password",
  "/fusion-xpress/setup-authenticator",
  VISITOR_MANAGEMENT_PATH,
  "/dashboard/account",
  "/dashboard/invoices",
  "/dashboard/campaigns",
  "/pay",
  "/voting",
  "/receipt",
  "/verify-email",
  "/events/tickets",
  "/kcm/cfm-tickets",
] as const;

/**
 * First URL segment of marketing / portal routes that must not be treated as a campaign slug.
 * Keep in sync with android-shell UrlPolicy.
 */
export const ANDROID_SHELL_BLOCKED_FIRST_SEGMENTS = [
  "about",
  "admin",
  "api",
  "app",
  "application",
  "blogs",
  "career",
  "careers",
  "cart",
  "contact",
  "cookies",
  "dashboard",
  "events",
  "fusion-xpress",
  "invite",
  "invoice",
  "jobs",
  "kcm",
  "login",
  "marketing-fusion",
  "merchandise",
  "news",
  "nominate-models",
  "page-not-found",
  "pay",
  "portfolios",
  "privacy",
  "profile",
  "receipt",
  "research",
  "services",
  "talent",
  "terms",
  "testimonials",
  "track-application",
  "training",
  "verify-email",
  "voting",
] as const;

export function androidShellHref(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (suffix === "/app" || suffix.startsWith("/app/")) return suffix;
  const joiner = suffix.includes("?") ? "&" : "?";
  return `${suffix}${joiner}app=1`;
}

/** Only allow in-app return paths after Fusion Xpress sign-in. */
export function safeAppRedirect(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/app")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}

export function visitorSignInHref(returnTo?: string): string {
  const dest = safeAppRedirect(returnTo) ?? ANDROID_SHELL_HOME_PATH;
  return `${ANDROID_SHELL_SIGN_IN_PATH}?redirect=${encodeURIComponent(dest)}`;
}
