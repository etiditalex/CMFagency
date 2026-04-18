"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  FileText,
  Images,
  Instagram,
  LayoutGrid,
  Loader2,
  LogOut,
  Pencil,
  PlusCircle,
  Share2,
  ShieldCheck,
  Trash2,
  Twitter,
  UserRound,
  Wallet,
} from "lucide-react";

type PortfolioItem = {
  id: string;
  file_url: string;
  mime_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type PortalState = {
  authenticated: boolean;
  account_status: "active" | "inactive";
  membership: {
    id: string;
    first_name: string;
    second_name: string;
    contact: string;
    email: string;
    payment_status: string;
    status: string;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    profile_category: "high_fashion_model" | "pageant_model" | null;
    professional_title: string | null;
    bio: string | null;
    portfolio_text: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_tiktok: string | null;
    social_x: string | null;
  } | null;
  portfolio_items: PortfolioItem[];
};

type WalletTransaction = {
  id: string;
  amount_kes: number;
  status: "pending" | "success" | "failed";
  phone: string;
  mpesa_receipt: string | null;
  failure_reason: string | null;
  initiated_at: string;
  paid_at: string | null;
  created_at: string;
};

type WalletState = {
  balance_kes: number;
  pending_kes: number;
  transactions: WalletTransaction[];
};

/** Monday 00:00 local → next Monday 00:00 (current calendar week). */
function getCurrentWeekBounds(): { start: number; end: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return { start, end };
}

function hasSuccessfulContributionThisWeek(transactions: WalletTransaction[] | undefined): boolean {
  if (!transactions?.length) return false;
  const { start, end } = getCurrentWeekBounds();
  return transactions.some((t) => {
    if (t.status !== "success") return false;
    const raw = t.paid_at ?? t.initiated_at;
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    return ts >= start && ts < end;
  });
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type PortalSection = "dashboard" | "edit-profile" | "portfolio-uploads" | "wallet";

type KcmMemberPortalPageProps = {
  section?: PortalSection;
};

export function KcmMemberPortalPage({ section = "dashboard" }: KcmMemberPortalPageProps) {
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<PortalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [profileCategory, setProfileCategory] = useState<"high_fashion_model" | "pageant_model">("high_fashion_model");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioText, setPortfolioText] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialX, setSocialX] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [editingWrittenPortfolio, setEditingWrittenPortfolio] = useState(true);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [walletAmount, setWalletAmount] = useState("1000");
  const [walletPhone, setWalletPhone] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletRefreshing, setWalletRefreshing] = useState(false);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const portfolioUiSyncedRef = useRef(false);

  const loadMe = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/kcm-member/me", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as PortalState & { error?: string };
      if (!res.ok) {
        setData(null);
        if (res.status !== 401) setError(json.error ?? "Could not load portal.");
        return;
      }
      setData(json);
      setDisplayName(json.profile?.display_name ?? `${json.membership.first_name} ${json.membership.second_name}`.trim());
      setCoverUrl(json.profile?.cover_url ?? null);
      setProfileCategory(json.profile?.profile_category === "pageant_model" ? "pageant_model" : "high_fashion_model");
      setProfessionalTitle(json.profile?.professional_title ?? "");
      setBio(json.profile?.bio ?? "");
      setPortfolioText(json.profile?.portfolio_text ?? "");
      setSocialInstagram(json.profile?.social_instagram ?? "");
      setSocialFacebook(json.profile?.social_facebook ?? "");
      setSocialTiktok(json.profile?.social_tiktok ?? "");
      setSocialX(json.profile?.social_x ?? "");
      setPortfolioItems(Array.isArray(json.portfolio_items) ? json.portfolio_items : []);
      setWalletPhone(json.membership.contact ?? "");
      if (!portfolioUiSyncedRef.current) {
        portfolioUiSyncedRef.current = true;
        const hasWritten = (json.profile?.portfolio_text ?? "").trim().length > 0;
        setEditingWrittenPortfolio(!hasWritten);
      }
    } catch {
      setData(null);
      setError("Could not load portal.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void loadMe();
  }, []);

  const loadWallet = async (background = false) => {
    if (!background) setWalletRefreshing(true);
    setWalletError(null);
    try {
      const res = await fetch("/api/kcm-member/wallet", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as WalletState & { error?: string };
      if (!res.ok) {
        setWalletError(json.error ?? "Could not load wallet.");
        return;
      }
      setWallet(json);
    } catch {
      setWalletError("Could not load wallet.");
    } finally {
      if (!background) setWalletRefreshing(false);
    }
  };

  useEffect(() => {
    if (data?.authenticated) {
      void loadWallet();
    } else {
      setWallet(null);
    }
  }, [data?.authenticated, data?.membership.id]);

  useEffect(() => {
    const hasPending = (wallet?.transactions ?? []).some((tx) => tx.status === "pending");
    if (!hasPending || !data?.authenticated) return;
    const id = window.setInterval(() => {
      void loadWallet(true);
    }, 8000);
    return () => window.clearInterval(id);
  }, [wallet?.transactions, data?.authenticated]);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setSendingCode(true);
    setError(null);
    try {
      const res = await fetch("/api/kcm-member/send-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not send code.");
        return;
      }
      setProfileMessage("Verification code sent. Check your email.");
    } catch {
      setError("Could not send code.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/kcm-member/verify-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Verification failed.");
        return;
      }
      setCode("");
      await loadMe();
    } catch {
      setError("Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const persistProfile = async () => {
    setSavingProfile(true);
    setError(null);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/kcm-member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          profile_category: profileCategory,
          professional_title: professionalTitle,
          bio,
          portfolio_text: portfolioText,
          social_instagram: socialInstagram,
          social_facebook: socialFacebook,
          social_tiktok: socialTiktok,
          social_x: socialX,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save profile.");
        return;
      }
      setProfileMessage("Profile updated.");
      setEditingWrittenPortfolio(false);
      await loadMe();
    } catch {
      setError("Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await persistProfile();
  };

  const onAvatarChange = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);
    setProfileMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/kcm-member/profile/avatar", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not upload image.");
        return;
      }
      setProfileMessage("Profile image updated.");
      await loadMe();
    } catch {
      setError("Could not upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onCoverChange = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    setProfileMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/kcm-member/profile/cover", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { error?: string; cover_url?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not upload cover image.");
        return;
      }
      setCoverUrl(json.cover_url ?? null);
      setProfileMessage("Cover photo updated.");
      await loadMe();
    } catch {
      setError("Could not upload cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCoverPhoto = async () => {
    if (!coverUrl) return;
    setRemovingCover(true);
    setError(null);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/kcm-member/profile/cover", { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not remove cover image.");
        return;
      }
      setCoverUrl(null);
      setProfileMessage("Cover photo removed.");
      await loadMe();
    } catch {
      setError("Could not remove cover image.");
    } finally {
      setRemovingCover(false);
    }
  };

  const onPortfolioFile = async (file: File | null) => {
    if (!file) return;
    setUploadingPortfolio(true);
    setError(null);
    setProfileMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("caption", uploadCaption.trim());
      const res = await fetch("/api/kcm-member/portfolio/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { error?: string; item?: PortfolioItem };
      if (!res.ok) {
        setError(json.error ?? "Could not upload file.");
        return;
      }
      setUploadCaption("");
      setProfileMessage("Portfolio file added.");
      if (json.item) {
        setPortfolioItems((prev) => [...prev, json.item!].sort((a, b) => a.sort_order - b.sort_order));
      } else {
        await loadMe();
      }
    } catch {
      setError("Could not upload file.");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const deletePortfolioItem = async (id: string) => {
    setDeletingPortfolioId(id);
    setError(null);
    setProfileMessage(null);
    try {
      const res = await fetch(`/api/kcm-member/portfolio/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not remove file.");
        return;
      }
      setPortfolioItems((prev) => prev.filter((p) => p.id !== id));
      setProfileMessage("Portfolio file removed.");
    } catch {
      setError("Could not remove file.");
    } finally {
      setDeletingPortfolioId(null);
    }
  };

  const saveCaption = async (id: string, caption: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/kcm-member/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; item?: PortfolioItem };
      if (!res.ok) {
        setError(json.error ?? "Could not update caption.");
        return;
      }
      if (json.item) {
        setPortfolioItems((prev) => prev.map((p) => (p.id === id ? json.item! : p)));
      }
    } catch {
      setError("Could not update caption.");
    }
  };

  const logout = async () => {
    await fetch("/api/kcm-member/logout", { method: "POST" });
    setData(null);
    setProfileMessage(null);
    setWallet(null);
    setWalletMessage(null);
    setWalletError(null);
    portfolioUiSyncedRef.current = false;
    setEditingWrittenPortfolio(true);
  };

  const promptContribution = async (e: FormEvent) => {
    e.preventDefault();
    setWalletBusy(true);
    setWalletError(null);
    setWalletMessage(null);
    try {
      const amountKes = Math.round(Number(walletAmount));
      const res = await fetch("/api/kcm-member/wallet/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_kes: amountKes,
          phone: walletPhone.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setWalletError(json.error ?? "Could not send payment prompt.");
        return;
      }
      setWalletMessage(json.message ?? "Payment prompt sent.");
      await loadWallet();
    } catch {
      setWalletError("Could not send payment prompt.");
    } finally {
      setWalletBusy(false);
    }
  };

  const savedPortfolioText = (data?.profile?.portfolio_text ?? "").trim();
  const cancelEditWrittenPortfolio = () => {
    setPortfolioText(data?.profile?.portfolio_text ?? "");
    setEditingWrittenPortfolio(false);
  };

  const handle = useMemo(() => {
    const base = (displayName || data?.membership.email || "member")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24);
    return base || "member";
  }, [data?.membership.email, displayName]);

  const shareProfile = async () => {
    const title = professionalTitle || `${profileCategory === "pageant_model" ? "Pageant Model" : "High Fashion Model"} Profile`;
    const text = `${displayName || data?.membership.first_name} - ${title}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "KCM Member Profile", text, url });
      } else if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
        setProfileMessage("Profile link copied. Share it on your socials.");
      }
    } catch {
      // user canceled share dialog
    }
  };

  const navItemClass = (target: PortalSection) =>
    `block shrink-0 snap-start min-w-[150px] rounded-xl border px-3 py-2.5 text-center text-sm font-semibold leading-snug [word-break:break-word] sm:min-w-0 sm:rounded-md sm:border-0 sm:px-3 sm:py-2 sm:text-left ${
      section === target ? "bg-primary-100 text-primary-900" : "text-gray-900 hover:bg-gray-100"
    }`;

  const totalContributionKes = wallet?.balance_kes ?? 0;
  const membershipBadge = useMemo(() => {
    if (data?.account_status !== "active") return { label: "Pending Member", tone: "bg-amber-100 text-amber-800" };
    if (totalContributionKes >= 20000) return { label: "Platinum Member", tone: "bg-violet-100 text-violet-800" };
    if (totalContributionKes >= 10000) return { label: "Gold Member", tone: "bg-yellow-100 text-yellow-800" };
    if (totalContributionKes >= 5000) return { label: "Silver Member", tone: "bg-slate-100 text-slate-800" };
    return { label: "Bronze Member", tone: "bg-orange-100 text-orange-800" };
  }, [data?.account_status, totalContributionKes]);

  const contributedThisWeek = useMemo(
    () => hasSuccessfulContributionThisWeek(wallet?.transactions),
    [wallet?.transactions],
  );

  if (checking) {
    return (
      <main className="min-h-[100dvh] bg-gray-50 px-4 py-24 sm:px-6">
        <div className="mx-auto flex min-h-[50dvh] w-full max-w-5xl items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        </div>
      </main>
    );
  }

  const loginBackgroundStyle = !data
    ? {
        backgroundImage:
          "linear-gradient(135deg, rgba(6, 18, 52, 0.9), rgba(8, 40, 88, 0.88)), url('https://res.cloudinary.com/dyfnobo9r/image/upload/v1776151059/models_wjrxfw.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <main
      className={
        data
          ? "min-h-[100dvh] overflow-x-hidden bg-gray-50 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 sm:pt-4 md:py-6 lg:py-8"
          : "min-h-[100dvh] bg-gray-50 px-3 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 md:px-6"
      }
      style={loginBackgroundStyle}
    >
      <section
        className={
          data
            ? "w-full min-w-0 max-w-full px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10"
            : "mx-auto flex min-h-[100dvh] w-full max-w-[1200px] items-center justify-center py-10 sm:py-12 md:py-16"
        }
      >
        <div className={data ? "w-full max-w-none" : "mx-auto w-full max-w-2xl"}>
          {!data ? (
            <div className="w-full rounded-2xl border border-white/50 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-6 md:p-8">
              <h1 className="text-left text-2xl font-extrabold text-gray-900 md:text-3xl">KCM Member Portal</h1>
              <p className="mt-2 text-sm text-gray-600">
                Sign in with your paid membership email. We will send a verification code to your inbox.
              </p>
              {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {profileMessage && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{profileMessage}</p>}
              <form onSubmit={sendCode} className="mt-5 space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                  required
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={sendingCode}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto sm:py-2.5"
                >
                  {sendingCode ? "Sending..." : "Send login code"}
                </button>
              </form>

              <form onSubmit={verifyCode} className="mt-6 space-y-3 border-t border-gray-200 pt-5">
                <label className="block text-sm font-medium text-gray-700">Enter verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-base tracking-widest text-gray-900 outline-none transition focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 sm:text-sm"
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto sm:py-2.5"
                >
                  {verifying ? "Verifying..." : "Verify and continue"}
                </button>
              </form>
            </div>
          ) : (
            <div className="max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:rounded-lg">
              <div className="grid min-h-[calc(100dvh-2.5rem)] min-w-0 max-w-full grid-cols-1 lg:min-h-[min(100dvh,920px)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                <aside className="min-w-0 max-w-full border-b border-gray-200 bg-gray-50 lg:border-b-0 lg:border-r lg:bg-white">
                  <div className="border-b border-gray-200 px-4 pt-4 pb-4 lg:bg-gray-50 lg:pt-5">
                    <p className="text-sm font-extrabold uppercase tracking-[0.08em] leading-6 text-gray-900 [word-break:break-word]">KCM Portal</p>
                    <p className="mt-1.5 break-words text-sm font-bold leading-snug text-gray-900">
                      {displayName || data.membership.first_name}
                    </p>
                  </div>
                  <nav
                    className="overflow-x-auto overscroll-x-contain px-3 py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:p-3"
                    aria-label="Portal sections"
                  >
                    <div className="flex snap-x snap-mandatory gap-2 pb-1 pr-1 lg:block lg:space-y-1 lg:pb-0 lg:pr-0">
                    <Link href="/kcm/member-portal" className={navItemClass("dashboard")}>
                      Profile overview
                    </Link>
                    <Link href="/kcm/member-portal/edit-profile" className={navItemClass("edit-profile")}>
                      Edit profile
                    </Link>
                    <Link href="/kcm/member-portal/portfolio-uploads" className={navItemClass("portfolio-uploads")}>
                      Portfolio uploads
                    </Link>
                    <Link href="/kcm/member-portal/wallet" className={navItemClass("wallet")}>
                      Member wallet
                    </Link>
                    </div>
                  </nav>
                  <div className="border-t border-gray-100 p-3 space-y-3">
                    <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-800">Membership badge</p>
                      <div className="mt-2 flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-primary-700" />
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${membershipBadge.tone}`}>
                          {membershipBadge.label}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-secondary-700" />
                        <p className="text-sm font-semibold text-gray-900">Member wallet</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-gray-50 px-2 py-2">
                          <p className="text-gray-500">Balance</p>
                          <p className="font-bold text-gray-900">KES {(wallet?.balance_kes ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 px-2 py-2">
                          <p className="text-amber-700">Pending</p>
                          <p className="font-bold text-amber-900">KES {(wallet?.pending_kes ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div
                        className={`mt-3 rounded-lg border px-2.5 py-2.5 text-[11px] font-semibold leading-snug [overflow-wrap:anywhere] sm:text-xs ${
                          contributedThisWeek
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-red-200 bg-red-50 text-red-800"
                        }`}
                      >
                        Weekly contribution:{" "}
                        {contributedThisWeek ? "Contributed this week" : "Not contributed this week"}
                      </div>
                      <Link
                        href="/kcm/member-portal/wallet"
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary-700 sm:min-h-10 sm:py-2"
                      >
                        Open wallet page
                      </Link>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="min-w-0 text-[11px] leading-snug text-gray-500 [overflow-wrap:anywhere]">
                          {wallet?.transactions?.[0]?.status === "pending" ? "Waiting for latest payment confirmation..." : "Wallet synced"}
                        </p>
                        <button
                          type="button"
                          onClick={() => void loadWallet()}
                          disabled={walletRefreshing}
                          className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-lg px-3 text-xs font-semibold text-secondary-700 hover:bg-secondary-50 hover:text-secondary-800 disabled:opacity-60 sm:min-h-0 sm:self-auto sm:px-0 sm:text-[11px] sm:hover:bg-transparent"
                        >
                          {walletRefreshing ? "Refreshing..." : "Refresh"}
                        </button>
                      </div>
                      {walletError ? <p className="mt-2 text-xs text-red-700">{walletError}</p> : null}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex min-h-11 w-full min-w-0 flex-wrap items-center justify-center gap-2 whitespace-normal rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-gray-100 sm:min-h-10 sm:rounded-md sm:py-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </aside>

                <div className="min-w-0 max-w-full bg-slate-100">
                  <div className="space-y-4 p-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:space-y-5 sm:p-4 sm:pb-6 md:space-y-6 md:p-6">
              {section === "dashboard" ? (
              <>
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-secondary-500 via-primary-700 to-primary-900 px-5 pb-6 pt-5 text-white shadow-md sm:px-6 sm:pb-7 sm:pt-6">
                  <p className="text-sm font-medium text-white/85">{getTimeGreeting()}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayName || data.membership.first_name}
                  </p>
                  <p className="mt-2 max-w-full break-words text-sm text-white/75 [overflow-wrap:anywhere]">{data.membership.email}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-900">Quick actions</p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Link
                      href="/kcm/member-portal"
                      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors ${
                        section === "dashboard"
                          ? "bg-primary-100 ring-2 ring-primary-500/25"
                          : "bg-slate-50 hover:bg-primary-50 active:bg-primary-100"
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                        <LayoutGrid className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-semibold leading-tight text-gray-800">Overview</span>
                    </Link>
                    <Link
                      href="/kcm/member-portal/edit-profile"
                      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 px-1 py-2 text-center transition-colors hover:bg-primary-50 active:bg-primary-100"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Pencil className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-semibold leading-tight text-gray-800">Edit</span>
                    </Link>
                    <Link
                      href="/kcm/member-portal/portfolio-uploads"
                      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 px-1 py-2 text-center transition-colors hover:bg-primary-50 active:bg-primary-100"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                        <Images className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-semibold leading-tight text-gray-800">Portfolio</span>
                    </Link>
                    <Link
                      href="/kcm/member-portal/wallet"
                      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 px-1 py-2 text-center transition-colors hover:bg-primary-50 active:bg-primary-100"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                        <Wallet className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-semibold leading-tight text-gray-800">Wallet</span>
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative h-44 w-full overflow-hidden bg-gradient-to-r from-primary-900 via-primary-700 to-secondary-600 sm:h-48">
                  {coverUrl ? (
                    <Image src={coverUrl} alt="Profile cover" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] bg-cover bg-center opacity-25" />
                  )}
                  <div className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col gap-2 sm:inset-x-auto sm:right-3 sm:top-3 sm:max-w-[min(100%-1.5rem,22rem)] sm:flex-row sm:flex-wrap sm:justify-end">
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-gray-700 shadow sm:w-auto sm:flex-wrap sm:justify-end sm:text-left">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{uploadingCover ? "Uploading..." : "Upload cover photo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => void onCoverChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {coverUrl ? (
                    <button
                      type="button"
                      onClick={() => void removeCoverPhoto()}
                      disabled={removingCover}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-red-700 shadow hover:bg-white disabled:opacity-60 sm:w-auto"
                    >
                      {removingCover ? "Removing..." : "Remove cover"}
                    </button>
                  ) : null}
                  </div>
                </div>
                <div className="relative min-w-0 px-4 pb-6 pt-0 sm:px-6">
                  <div className="-mt-10 flex min-w-0 flex-col gap-4 sm:-mt-12">
                    <div className="flex min-w-0 max-w-full flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-gray-100 shadow-md ring-1 ring-gray-100">
                        {data.profile?.avatar_url ? (
                          <Image src={data.profile.avatar_url} alt="Profile avatar" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <UserRound className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 self-center pb-0 sm:self-end sm:pb-1">
                        <p className="break-words text-base text-gray-700 [overflow-wrap:anywhere] sm:text-lg">@{handle}</p>
                        <p className="pt-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-700">
                          {profileCategory === "pageant_model" ? "Pageant model" : "High Fashion model"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-start">
                      <Link
                        href="/kcm/member-portal/edit-profile"
                        className="inline-flex min-h-10 min-w-0 w-full items-center justify-center gap-1.5 whitespace-normal rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 sm:w-auto sm:max-w-full sm:justify-start sm:text-left"
                      >
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Add profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void shareProfile()}
                        className="inline-flex min-h-10 min-w-0 w-full items-center justify-center gap-1.5 whitespace-normal rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 sm:w-auto sm:max-w-full sm:justify-start sm:text-left"
                      >
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Share to socials</span>
                      </button>
                    </div>
                  </div>
                  {professionalTitle ? (
                    <h3 className="mt-5 break-words text-center text-xl font-extrabold text-gray-900 sm:text-left sm:text-2xl">{professionalTitle}</h3>
                  ) : null}
                  <p className="mt-2 whitespace-pre-line break-words text-center text-sm leading-relaxed text-gray-700 sm:text-left">
                    {bio || "Add your description below to complete your profile."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-gray-100 bg-slate-50 px-3 py-3 sm:justify-start">
                    <span className="w-full text-center text-xs font-semibold uppercase tracking-wide text-gray-500 sm:w-auto sm:text-left">Social</span>
                    {socialInstagram ? (
                      <a
                        href={socialInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-pink-600 transition hover:bg-pink-100 hover:text-pink-700"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    ) : null}
                    {socialFacebook ? (
                      <a
                        href={socialFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9V12.06h2.54V9.84c0-2.52 1.49-3.92 3.79-3.92 1.1 0 2.25.2 2.25.2v2.48h-1.27c-1.26 0-1.65.79-1.65 1.6v1.86h2.81l-.45 2.91h-2.36V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
                      </a>
                    ) : null}
                    {socialTiktok ? (
                      <a
                        href={socialTiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 hover:text-black"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.35V2h-3.2v13.18a2.9 2.9 0 11-2-2.77V9.13a6.13 6.13 0 105.2 6.05V8.57a8.07 8.07 0 004.57 1.42V6.69z"/></svg>
                      </a>
                    ) : null}
                    {socialX ? (
                      <a
                        href={socialX}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 hover:text-black"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    ) : null}
                    {!socialInstagram && !socialFacebook && !socialTiktok && !socialX ? (
                      <span className="text-xs text-gray-500">Add social links in Edit profile</span>
                    ) : null}
                  </div>
                </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary-950">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="min-w-0 break-words">
                      Account status: <span className="uppercase">{data.account_status}</span>
                    </span>
                  </p>
                  <p className="mt-2 break-words text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere]">
                    Payment status: {data.membership.payment_status} | Membership review: {data.membership.status}
                  </p>
                </div>
              </>
              ) : null}

              {section === "edit-profile" || section === "portfolio-uploads" ? (
              <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <h2 className="text-left text-xl font-extrabold text-gray-900">Your profile</h2>
                {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {profileMessage && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{profileMessage}</p>}

                <div className="mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {data.profile?.avatar_url ? (
                      <Image src={data.profile.avatar_url} alt="Profile avatar" fill className="object-cover" />
                    ) : null}
                  </div>
                  <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:min-h-10 sm:w-auto sm:py-2">
                    {uploadingAvatar ? "Uploading..." : "Upload image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => void onAvatarChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <form onSubmit={saveProfile} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Display name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                      <select
                        value={profileCategory}
                        onChange={(e) =>
                          setProfileCategory(e.target.value === "pageant_model" ? "pageant_model" : "high_fashion_model")
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                      >
                        <option value="high_fashion_model">High Fashion model</option>
                        <option value="pageant_model">Pageant model</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Professional title</label>
                      <input
                        type="text"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                        placeholder={profileCategory === "pageant_model" ? "Award-winning Pageant Model" : "Runway and Editorial Model"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                      placeholder="Tell us about your modeling journey..."
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <label className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">Experience</label>
                      {!editingWrittenPortfolio ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPortfolioText(data?.profile?.portfolio_text ?? "");
                            setEditingWrittenPortfolio(true);
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold leading-snug text-gray-900 hover:bg-gray-50 sm:w-auto sm:shrink-0 sm:py-1.5 sm:text-left"
                        >
                          {savedPortfolioText ? "Edit" : "Add written portfolio"}
                        </button>
                      ) : null}
                    </div>
                    <p className="mb-3 text-xs text-gray-600">
                      Describe your experience, brands, runway, editorial work, or goals. This complements your uploaded portfolio files below.
                    </p>
                    {editingWrittenPortfolio ? (
                      <>
                        <textarea
                          value={portfolioText}
                          onChange={(e) => setPortfolioText(e.target.value)}
                          rows={8}
                          maxLength={12000}
                          className="min-h-[180px] w-full min-w-0 resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                          placeholder="e.g. Commercial and editorial work since 2022; featured in…"
                        />
                        <p className="mt-1 text-right text-xs text-gray-500">{portfolioText.length} / 12000</p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            onClick={cancelEditWrittenPortfolio}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:w-auto"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingProfile}
                            onClick={() => void persistProfile()}
                            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
                          >
                            {savingProfile ? "Saving…" : "Save written portfolio"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="min-h-[120px] min-w-0 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-sm">
                        {savedPortfolioText ? (
                          <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{data?.profile?.portfolio_text}</p>
                        ) : (
                          <p className="break-words text-gray-500">
                            You have not added a written portfolio yet. Click &quot;Add written portfolio&quot; to get started.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Instagram URL</label>
                      <input
                        type="url"
                        value={socialInstagram}
                        onChange={(e) => setSocialInstagram(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                        inputMode="url"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Facebook URL</label>
                      <input
                        type="url"
                        value={socialFacebook}
                        onChange={(e) => setSocialFacebook(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                        inputMode="url"
                        placeholder="https://facebook.com/yourprofile"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">TikTok URL</label>
                      <input
                        type="url"
                        value={socialTiktok}
                        onChange={(e) => setSocialTiktok(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                        inputMode="url"
                        placeholder="https://tiktok.com/@yourhandle"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">X/Twitter URL</label>
                      <input
                        type="url"
                        value={socialX}
                        onChange={(e) => setSocialX(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm"
                        inputMode="url"
                        placeholder="https://x.com/yourhandle"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <h2 className="text-left text-xl font-extrabold text-gray-900">Portfolio uploads</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Add photos or PDFs (up to 15 files). JPG, PNG, WebP, or PDF — large images up to 8MB, PDFs up to 6MB.
                </p>

                <div className="mt-4 space-y-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Optional caption for next upload</label>
                    <input
                      type="text"
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value.slice(0, 500))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 outline-none transition focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 sm:text-sm"
                      placeholder="e.g. Coast Fashion Week 2025"
                    />
                  </div>
                  <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-secondary-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto sm:py-2.5">
                    {uploadingPortfolio ? "Uploading..." : "Choose file to upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      disabled={uploadingPortfolio || portfolioItems.length >= 15}
                      onChange={(e) => void onPortfolioFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {portfolioItems.length >= 15 ? (
                    <p className="text-xs text-amber-700">You have reached the maximum of 15 portfolio files.</p>
                  ) : null}
                </div>

                {portfolioItems.length > 0 ? (
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {portfolioItems.map((item) => (
                      <li key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        <div className="relative aspect-[4/3] w-full bg-gray-200">
                          {item.mime_type.startsWith("image/") ? (
                            <Image src={item.file_url} alt={item.caption || "Portfolio"} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
                          ) : (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-primary-700 hover:bg-primary-50"
                            >
                              <FileText className="h-10 w-10" />
                              <span className="text-sm font-semibold">Open PDF</span>
                            </a>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <input
                              key={`${item.id}-${item.caption ?? ""}`}
                              type="text"
                              defaultValue={item.caption ?? ""}
                              placeholder="Caption"
                              className="min-w-0 w-full flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next !== (item.caption ?? "").trim()) void saveCaption(item.id, next);
                              }}
                            />
                            <button
                              type="button"
                              disabled={deletingPortfolioId === item.id}
                              onClick={() => void deletePortfolioItem(item.id)}
                              className="inline-flex items-center justify-center self-end rounded border border-red-100 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50 sm:self-auto sm:border-0 sm:px-1.5 sm:py-1.5"
                              aria-label="Remove file"
                            >
                              {deletingPortfolioId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No portfolio files yet. Upload images or a PDF to showcase your work.</p>
                )}
              </div>
              </>
              ) : null}

              {section === "wallet" ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-left text-xl font-extrabold text-gray-900">Member wallet</h2>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${membershipBadge.tone}`}>
                    {membershipBadge.label}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Current balance</p>
                    <p className="mt-1 text-2xl font-extrabold text-gray-900">KES {(wallet?.balance_kes ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-700">Pending prompt amount</p>
                    <p className="mt-1 text-2xl font-extrabold text-amber-900">KES {(wallet?.pending_kes ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <form onSubmit={promptContribution} className="mt-5 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="number"
                    min={1}
                    inputMode="decimal"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Amount (KES)"
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none transition focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 sm:min-h-0 sm:text-sm"
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={walletPhone}
                    onChange={(e) => setWalletPhone(e.target.value)}
                    placeholder="M-Pesa number"
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none transition focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 sm:min-h-0 sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={walletBusy}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary-700 disabled:opacity-60 md:min-h-10 md:w-auto"
                  >
                    {walletBusy ? "Sending..." : "Prompt payment"}
                  </button>
                </form>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="min-w-0 text-xs leading-snug text-gray-500 [overflow-wrap:anywhere]">
                    {wallet?.transactions?.[0]?.status === "pending" ? "Waiting for latest payment confirmation..." : "Wallet synced"}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadWallet()}
                    disabled={walletRefreshing}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-lg px-3 text-xs font-semibold text-secondary-700 hover:bg-secondary-50 hover:text-secondary-800 disabled:opacity-60 sm:min-h-0 sm:self-auto sm:px-0 sm:hover:bg-transparent"
                  >
                    {walletRefreshing ? "Refreshing..." : "Refresh wallet"}
                  </button>
                </div>
                {walletError ? <p className="mt-2 text-sm text-red-700">{walletError}</p> : null}
                {walletMessage ? <p className="mt-2 text-sm text-green-700">{walletMessage}</p> : null}
                {(wallet?.transactions?.length ?? 0) > 0 ? (
                  <div className="mt-5 -mx-1 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 px-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wallet?.transactions ?? []).map((tx) => (
                          <tr key={tx.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{new Date(tx.created_at).toLocaleString()}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900">KES {Number(tx.amount_kes ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-700">{tx.phone}</td>
                            <td className="px-3 py-2">
                              <span className={tx.status === "success" ? "text-green-700" : tx.status === "failed" ? "text-red-700" : "text-amber-700"}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{tx.mpesa_receipt ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No wallet transactions yet.</p>
                )}
              </div>
              ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function KcmMemberPortalDashboardPage() {
  return <KcmMemberPortalPage section="dashboard" />;
}
