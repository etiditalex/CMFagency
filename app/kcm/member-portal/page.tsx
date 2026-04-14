"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, LogOut, ShieldCheck } from "lucide-react";

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
  } | null;
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
        body: JSON.stringify({ display_name: displayName, bio }),
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
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
