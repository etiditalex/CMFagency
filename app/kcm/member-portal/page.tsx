"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { FileText, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";

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
    bio: string | null;
    portfolio_text: string | null;
  } | null;
  portfolio_items: PortfolioItem[];
};

export default function KcmMemberPortalPage() {
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<PortalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioText, setPortfolioText] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

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
      setBio(json.profile?.bio ?? "");
      setPortfolioText(json.profile?.portfolio_text ?? "");
      setPortfolioItems(Array.isArray(json.portfolio_items) ? json.portfolio_items : []);
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

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/kcm-member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          portfolio_text: portfolioText,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save profile.");
        return;
      }
      setProfileMessage("Profile updated.");
      await loadMe();
    } catch {
      setError("Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
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
  };

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
    <main className="min-h-screen bg-gray-50 pt-28 pb-12">
      <section className="container-custom">
        <div className="mx-auto max-w-3xl">
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
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-left text-2xl font-extrabold text-gray-900 md:text-3xl">Welcome, {data.membership.first_name}</h1>
                    <p className="mt-1 text-sm text-gray-600">{data.membership.email}</p>
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
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary-900">
                    <ShieldCheck className="h-4 w-4" />
                    Account status: <span className="uppercase">{data.account_status}</span>
                  </p>
                  <p className="mt-1 text-xs text-primary-800">
                    Payment status: {data.membership.payment_status} | Membership review: {data.membership.status}
                  </p>
                </div>
              </div>

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
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Written portfolio</label>
                    <p className="mb-2 text-xs text-gray-500">
                      Describe your experience, brands, runway, editorial work, or goals. This complements your uploaded portfolio files below.
                    </p>
                    <textarea
                      value={portfolioText}
                      onChange={(e) => setPortfolioText(e.target.value)}
                      rows={6}
                      maxLength={12000}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                      placeholder="e.g. Commercial and editorial work since 2022; featured in…"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">{portfolioText.length} / 12000</p>
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
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
