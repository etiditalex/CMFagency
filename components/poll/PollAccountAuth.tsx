"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginWithPassword } from "@/lib/auth/password-login";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

async function openPollDashboard(token: string, remember: boolean) {
  const res = await fetch("/api/poll/session", {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ remember }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "This login is for poll accounts.");
}

export default function PollAccountAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (name.trim().length < 2 || !email.includes("@") || password.length < 8) {
          setError("Add your name, a valid email, and a password of at least 8 characters.");
          return;
        }
        const created = await fetch("/api/poll/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const createdJson = (await created.json().catch(() => ({}))) as { error?: string };
        if (!created.ok) throw new Error(createdJson.error || "Could not create the account.");
      } else if (!email.includes("@") || !password) {
        setError("Add your email and password.");
        return;
      }

      const { session } = await loginWithPassword(email, password);
      await openPollDashboard(session.access_token, remember);
      router.push("/dashboard/polling-fx/poll");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (mode === "signup" && /already exists/i.test(message)) {
        setError(message);
      } else if (mode === "signup") {
        await supabase.auth.signOut().catch(() => undefined);
        setError(message);
      } else {
        await supabase.auth.signOut().catch(() => undefined);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    setError("");
    setNotice("");
    if (!email.includes("@")) {
      setError("Add your email first, then choose forgot password.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/fusion-xpress/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setNotice("Check your email for a link to choose a new password.");
  }

  return (
    <main className="poll-auth flex min-h-screen items-center justify-center bg-primary-950 px-4 pb-16 pt-[calc(var(--site-nav-height)+2.5rem)]">
      <div className="w-full max-w-md">
        <img src={BRAND_LOGO_URL} alt="Changer Fusions" className="mx-auto h-14 w-auto" />
        <h1 className="poll-auth-title mt-6">{mode === "login" ? "Log in to your account" : "Create your free account"}</h1>
        <p className="poll-auth-switch mt-2 text-center text-sm text-white/70">
          {mode === "login" ? "Or " : "Or "}
          <Link href={mode === "login" ? "/poll/signup" : "/poll/login"} className="font-semibold text-primary-200 hover:text-white">
            {mode === "login" ? "create a free account" : "log in"}
          </Link>
        </p>

        <form onSubmit={(event) => void onSubmit(event)} className="mt-8 rounded-xl border border-white/10 border-t-2 border-t-primary-300 bg-primary-900 p-6 shadow-2xl">
          {mode === "signup" ? (
            <label className="block text-sm font-medium text-white/80">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="poll-auth-field mt-1.5" />
            </label>
          ) : null}
          <label className={`block text-sm font-medium text-white/80 ${mode === "signup" ? "mt-4" : ""}`}>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="poll-auth-field mt-1.5" />
          </label>
          <label className="mt-4 block text-sm font-medium text-white/80">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="poll-auth-field mt-1.5" />
          </label>

          {mode === "login" ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-primary-500" />
                Remember me
              </label>
              <button type="button" onClick={() => void sendReset()} className="text-sm font-semibold text-primary-200 hover:text-white">
                Forgot your password?
              </button>
            </div>
          ) : null}

          {error ? <p className="poll-auth-error mt-4 text-sm font-semibold text-[#ffb4b4]">{error}</p> : null}
          {notice ? <p className="mt-4 text-sm font-semibold text-primary-200">{notice}</p> : null}

          <button type="submit" disabled={loading} className="poll-auth-submit mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60">
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
