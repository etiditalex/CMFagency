"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Loader2, Send, Ticket, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type PurchaseRow = {
  reference: string;
  purchased_at: string;
  checked_in_at: string | null;
  revoked_at: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [revokingRef, setRevokingRef] = useState<string | null>(null);
  const [deletingRef, setDeletingRef] = useState<string | null>(null);
  const [sendingRef, setSendingRef] = useState<string | null>(null);

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

  const revokePurchase = async (row: PurchaseRow) => {
    const label = row.payer_name !== "—" ? row.payer_name : row.reference;
    const ok = window.confirm(
      `Revoke ticket for ${label}? The receipt/QR will be denied at the gate. The purchase record stays for reporting.`
    );
    if (!ok) return;

    setRevokingRef(row.reference);
    setNotice(null);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/gate/ticket-purchases/${encodeURIComponent(row.reference)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; revoked_at?: string };
      if (!res.ok) throw new Error(json.error ?? "Revoke failed");

      setPurchases((prev) =>
        prev.map((p) =>
          p.reference === row.reference
            ? { ...p, revoked_at: json.revoked_at ?? new Date().toISOString() }
            : p
        )
      );
      setNotice(`Ticket revoked for ${label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingRef(null);
    }
  };

  const deletePurchase = async (row: PurchaseRow) => {
    const label = row.payer_name !== "—" ? row.payer_name : row.reference;
    const ok = window.confirm(
      `Delete purchase for ${label}? This permanently removes the transaction and cannot be undone.`
    );
    if (!ok) return;

    setDeletingRef(row.reference);
    setNotice(null);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/gate/ticket-purchases/${encodeURIComponent(row.reference)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");

      setPurchases((prev) => prev.filter((p) => p.reference !== row.reference));
      setNotice(`Purchase removed for ${label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingRef(null);
    }
  };

  const resendTicketEmail = async (row: PurchaseRow) => {
    const label = row.payer_name !== "—" ? row.payer_name : row.reference;
    setSendingRef(row.reference);
    setNotice(null);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/gate/ticket-purchases/${encodeURIComponent(row.reference)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; email?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed");

      setNotice(`Ticket email sent again to ${json.email ?? label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendingRef(null);
    }
  };

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

      {notice && (
        <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">{notice}</div>
      )}
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
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Send</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revoke</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Delete</th>
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
                  const isRevoked = !!row.revoked_at;
                  const busy =
                    revokingRef === row.reference ||
                    deletingRef === row.reference ||
                    sendingRef === row.reference;
                  return (
                    <tr
                      key={row.reference}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${isRevoked ? "bg-red-50/40" : ""}`}
                    >
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{purchasedAt}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            Revoked
                          </span>
                        ) : row.checked_in_at ? (
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy || isRevoked}
                          onClick={() => void resendTicketEmail(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold disabled:opacity-60"
                        >
                          {sendingRef === row.reference ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Send
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isRevoked ? (
                          <span className="text-xs text-gray-500">
                            {new Date(row.revoked_at!).toLocaleString("en-GB", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void revokePurchase(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold disabled:opacity-60"
                          >
                            {revokingRef === row.reference ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            Revoke
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deletePurchase(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold disabled:opacity-60"
                        >
                          {deletingRef === row.reference ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </button>
                      </td>
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
