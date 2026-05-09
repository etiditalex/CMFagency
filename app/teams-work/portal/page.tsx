"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

export default function TeamsWorkPortalPage() {
  const searchParams = useSearchParams();
  const initialErrorKey = searchParams?.get("error") ?? null;

  const initialErrorMessage = useMemo(() => {
    if (initialErrorKey === "unauthorized") return "Access denied. Your account is not registered for the portal.";
    if (initialErrorKey === "setup") return "Portal is not configured yet. Please contact the system administrator.";
    return null;
  }, [initialErrorKey]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <section className="w-full min-w-0 text-white !text-left">
            {/*
              globals.css centers all h1 and justifies p/section — !text-left keeps this hero on one margin.
            */}
            <div className="flex w-full max-w-xl flex-col items-start gap-4">
              <p className="m-0 w-full !text-left text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">
                FX Team Members
              </p>
              <h1 className="m-0 w-full !text-left p-0 text-3xl font-extrabold leading-tight sm:text-4xl">
                Teams Work
              </h1>
              <p className="m-0 w-full !text-left text-sm font-medium leading-relaxed text-white/75">
                Member staff only. Sign in with the account your administrator gave you.
              </p>
            </div>
          </section>

          <section className="w-full">
            <PortalLoginForm
              initialErrorMessage={initialErrorMessage}
              layout="standalone"
              redirectTo="/dashboard/teams-work"
              className="max-w-lg"
            />
          </section>
        </div>
      </div>
    </div>
  );
}

