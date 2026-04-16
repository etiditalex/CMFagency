"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, FileText, Instagram, Loader2, LogOut, PlusCircle, Share2, ShieldCheck, Trash2, Twitter, UserRound } from "lucide-react";

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
    email: string;
    payment_status: string;
    status: string;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    profile_category: "creative" | "model" | null;
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

type PortalSection = "dashboard" | "edit-profile" | "portfolio-uploads";

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
  const [profileCategory, setProfileCategory] = useState<"creative" | "model">("creative");
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
      setProfileCategory(json.profile?.profile_category === "model" ? "model" : "creative");
      setProfessionalTitle(json.profile?.professional_title ?? "");
      setBio(json.profile?.bio ?? "");
      setPortfolioText(json.profile?.portfolio_text ?? "");
      setSocialInstagram(json.profile?.social_instagram ?? "");
      setSocialFacebook(json.profile?.social_facebook ?? "");
      setSocialTiktok(json.profile?.social_tiktok ?? "");
      setSocialX(json.profile?.social_x ?? "");
      setPortfolioItems(Array.isArray(json.portfolio_items) ? json.portfolio_items : []);
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
    portfolioUiSyncedRef.current = false;
    setEditingWrittenPortfolio(true);
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
    const title = professionalTitle || `${profileCategory === "model" ? "Model" : "Creative"} Profile`;
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
    `block rounded-md px-3 py-2 text-sm font-semibold leading-snug [word-break:break-word] ${
      section === target ? "bg-primary-100 text-primary-900" : "text-gray-900 hover:bg-gray-100"
    }`;

  if (checking) {
    return (
      <main className="min-h-screen bg-gray-50 pt-28">
        <div className="container-custom flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 md:py-8">
      <section className={data ? "w-full px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10" : "container-custom"}>
        <div className={data ? "w-full max-w-none" : "mx-auto max-w-[1200px]"}>
          {!data ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingCode}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono tracking-widest"
                  placeholder="000000"
                  required
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex items-center rounded-lg bg-secondary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary-700 disabled:opacity-60"
                >
                  {verifying ? "Verifying..." : "Verify and continue"}
                </button>
              </form>
            </div>
          ) : (
            <div className="overflow-x-clip border border-gray-200 bg-white shadow-sm lg:rounded-lg">
              <div className="grid min-h-[min(100vh,920px)] lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="min-w-0 border-b border-gray-200 bg-gray-50 lg:border-b-0 lg:border-r lg:bg-white">
                  <div className="border-b border-gray-200 px-4 pt-5 pb-4 lg:bg-gray-50">
                    <p className="text-sm font-extrabold uppercase tracking-[0.08em] leading-6 text-gray-900 [word-break:break-word]">KCM Portal</p>
                    <p className="mt-1.5 break-words text-sm font-bold leading-snug text-gray-900">
                      {displayName || data.membership.first_name}
                    </p>
                  </div>
                  <nav className="space-y-1 p-3">
                    <Link href="/kcm/member-portal" className={navItemClass("dashboard")}>
                      Profile overview
                    </Link>
                    <Link href="/kcm/member-portal/edit-profile" className={navItemClass("edit-profile")}>
                      Edit profile
                    </Link>
                    <Link href="/kcm/member-portal/portfolio-uploads" className={navItemClass("portfolio-uploads")}>
                      Portfolio uploads
                    </Link>
                  </nav>
                  <div className="border-t border-gray-100 p-3">
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex w-full min-w-0 flex-wrap items-center justify-center gap-2 whitespace-normal rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </aside>

                <div className="min-w-0 bg-[#f3f8fc]">
                  <div className="space-y-6 p-4 md:p-6">
              {section === "dashboard" ? (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-gradient-to-r from-primary-900 via-primary-700 to-secondary-600 sm:h-52">
                  {coverUrl ? (
                    <Image src={coverUrl} alt="Profile cover" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] bg-cover bg-center opacity-25" />
                  )}
                  <div className="absolute right-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2 sm:max-w-[min(100%-1.5rem,22rem)]">
                  <label className="inline-flex cursor-pointer flex-wrap items-center justify-end gap-2 rounded-md bg-white/95 px-3 py-2 text-left text-xs font-semibold leading-snug text-gray-700 shadow">
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
                      className="inline-flex items-center rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-red-700 shadow hover:bg-white disabled:opacity-60"
                    >
                      {removingCover ? "Removing..." : "Remove cover"}
                    </button>
                  ) : null}
                  </div>
                </div>
                <div className="relative min-w-0 px-4 pb-6 pt-0 sm:px-6">
                  <div className="-mt-12 flex min-w-0 flex-col gap-4">
                    <div className="flex min-w-0 max-w-full items-start gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-4 border-white bg-gray-100 shadow-sm">
                        {data.profile?.avatar_url ? (
                          <Image src={data.profile.avatar_url} alt="Profile avatar" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <UserRound className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 self-end pb-1">
                        <p className="break-all text-base text-gray-700 sm:text-lg">@{handle}</p>
                        <p className="pt-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-700">
                          {profileCategory === "model" ? "Model" : "Creative"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 w-full flex-wrap gap-2 sm:justify-start">
                      <Link
                        href="/kcm/member-portal/edit-profile"
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-normal rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Add profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void shareProfile()}
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-normal rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">Share to socials</span>
                      </button>
                    </div>
                  </div>
                  {professionalTitle ? (
                    <h3 className="mt-5 break-words text-2xl font-extrabold text-gray-900">{professionalTitle}</h3>
                  ) : null}
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
                    {bio || "Add your description below to complete your profile."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Share</span>
                    {socialInstagram ? (
                      <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700">
                        <Instagram className="h-4 w-4" />
                      </a>
                    ) : null}
                    {socialFacebook ? (
                      <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9V12.06h2.54V9.84c0-2.52 1.49-3.92 3.79-3.92 1.1 0 2.25.2 2.25.2v2.48h-1.27c-1.26 0-1.65.79-1.65 1.6v1.86h2.81l-.45 2.91h-2.36V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
                      </a>
                    ) : null}
                    {socialTiktok ? (
                      <a href={socialTiktok} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.35V2h-3.2v13.18a2.9 2.9 0 11-2-2.77V9.13a6.13 6.13 0 105.2 6.05V8.57a8.07 8.07 0 004.57 1.42V6.69z"/></svg>
                      </a>
                    ) : null}
                    {socialX ? (
                      <a href={socialX} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black">
                        <Twitter className="h-4 w-4" />
                      </a>
                    ) : null}
                    {!socialInstagram && !socialFacebook && !socialTiktok && !socialX ? (
                      <span className="text-xs text-gray-500">Add social links below</span>
                    ) : null}
                  </div>
                </div>
              </div>
              ) : null}

              {section !== "portfolio-uploads" ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-full">
                    <h1 className="break-words text-left text-2xl font-extrabold text-gray-900 md:text-3xl">
                      Welcome, {data.membership.first_name}
                    </h1>
                    <p className="mt-1 break-all text-sm text-gray-600">{data.membership.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
                <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50 p-4">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary-900">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">
                      Account status: <span className="uppercase">{data.account_status}</span>
                    </span>
                  </p>
                  <p className="mt-1 break-words text-xs text-primary-800">
                    Payment status: {data.membership.payment_status} | Membership review: {data.membership.status}
                  </p>
                </div>
              </div>
              ) : null}

              {section !== "dashboard" ? (
              <>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-left text-xl font-extrabold text-gray-900">Your profile</h2>
                {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {profileMessage && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{profileMessage}</p>}

                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {data.profile?.avatar_url ? (
                      <Image src={data.profile.avatar_url} alt="Profile avatar" fill className="object-cover" />
                    ) : null}
                  </div>
                  <label className="inline-flex cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                      <select
                        value={profileCategory}
                        onChange={(e) => setProfileCategory(e.target.value === "model" ? "model" : "creative")}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      >
                        <option value="creative">Creative</option>
                        <option value="model">Model</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Professional title</label>
                      <input
                        type="text"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder={profileCategory === "model" ? "Runway and Editorial Model" : "Creative Professional"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      placeholder="Tell us about your modeling journey..."
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <label className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">Written portfolio</label>
                      {!editingWrittenPortfolio ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPortfolioText(data?.profile?.portfolio_text ?? "");
                            setEditingWrittenPortfolio(true);
                          }}
                          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-sm font-semibold leading-snug text-gray-900 hover:bg-gray-50"
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
                          className="min-h-[180px] w-full min-w-0 resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          placeholder="e.g. Commercial and editorial work since 2022; featured in…"
                        />
                        <p className="mt-1 text-right text-xs text-gray-500">{portfolioText.length} / 12000</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={cancelEditWrittenPortfolio}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingProfile}
                            onClick={() => void persistProfile()}
                            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Facebook URL</label>
                      <input
                        type="url"
                        value={socialFacebook}
                        onChange={(e) => setSocialFacebook(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://facebook.com/yourprofile"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">TikTok URL</label>
                      <input
                        type="url"
                        value={socialTiktok}
                        onChange={(e) => setSocialTiktok(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://tiktok.com/@yourhandle"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">X/Twitter URL</label>
                      <input
                        type="url"
                        value={socialX}
                        onChange={(e) => setSocialX(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                        placeholder="https://x.com/yourhandle"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
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
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g. Coast Fashion Week 2025"
                    />
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-secondary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary-700 disabled:opacity-60">
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
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
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
                          <div className="flex items-start justify-between gap-2">
                            <input
                              key={`${item.id}-${item.caption ?? ""}`}
                              type="text"
                              defaultValue={item.caption ?? ""}
                              placeholder="Caption"
                              className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next !== (item.caption ?? "").trim()) void saveCaption(item.id, next);
                              }}
                            />
                            <button
                              type="button"
                              disabled={deletingPortfolioId === item.id}
                              onClick={() => void deletePortfolioItem(item.id)}
                              className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
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
