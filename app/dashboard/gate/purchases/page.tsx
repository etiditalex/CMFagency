"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type PurchaseRow = {
  reference: string;
  purchased_at: string;
  checked_in_at: string | null;
  campaign: string;
  payer_name: string;
  email: string;
  payer_phone: string;
  referred_by: string;
  referrer_phone: string;
  amount: number;
  currency: string;
  quantity: number;
};

type EventOption = { slug: string; title: string };

export default function GateTicketPurchasesPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventSlug, setEventSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("reports")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return;

    let cancelled = false;
    const loadEvents = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/gate/events", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { events?: EventOption[] };
      if (!cancelled && data.events) setEvents(data.events);
    };
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");
        const url = eventSlug
          ? `/api/gate/ticket-purchases?event_slug=${encodeURIComponent(eventSlug)}`
          : "/api/gate/ticket-purchases";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `Failed (${res.status})`);
        }
        const data = (await res.json()) as { purchases?: PurchaseRow[] };
        if (!cancelled) setPurchases(data.purchases ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load purchases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature, eventSlug]);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("reports")) return null;

  return (
    <div className="text-left max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/gate"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gate
          </Link>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary-600" />
              Ticket purchases
            </h2>
            <p className="mt-1 text-sm text-gray-600 max-w-2xl">
              Every successful ticket purchase with payer and referral contact details.
            </p>
          </div>
          {events.length > 0 && (
            <select
              value={eventSlug}
              onChange={(e) => setEventSlug(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 bg-white"
            >
              <option value="">All events</option>
              {events.map((ev) => (
                <option key={ev.slug} value={ev.slug}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No ticket purchases yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Purchased</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Gate</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaign</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Payer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Payer phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Referrer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Referrer phone</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => {
                  const purchasedAt = new Date(row.purchased_at).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  });
                  const gateAt = row.checked_in_at
                    ? new Date(row.checked_in_at).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })
                    : "—";
                  return (
                    <tr
                      key={row.reference}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{purchasedAt}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.checked_in_at ? (
                          <span className="text-green-800">{gateAt}</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            Not scanned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-800">{row.reference}</td>
                      <td className="py-3 px-4 text-gray-800">{row.campaign}</td>
                      <td className="py-3 px-4 text-gray-800">
                        <div>{row.payer_name}</div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono">{row.payer_phone}</td>
                      <td className="py-3 px-4 text-gray-700">{row.referred_by}</td>
                      <td className="py-3 px-4 text-gray-700 font-mono">{row.referrer_phone}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{row.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
