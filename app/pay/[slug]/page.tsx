"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Ticket, Vote } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  description: string | null;
  currency: string;
  unit_amount: number;
  max_per_txn: number;
};

type Contestant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export default function PayCampaignPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") ?? null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);

  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contestantId, setContestantId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: c, error: cErr } = await supabase
          .from("campaigns")
          .select("id,type,slug,title,description,currency,unit_amount,max_per_txn")
          .eq("slug", slug)
          .single();

        if (cErr) throw cErr;

        if (!cancelled) setCampaign(c as Campaign);

        if (c?.type === "vote") {
          const { data: rows, error: rErr } = await supabase
            .from("contestants")
            .select("id,name,description,image_url,sort_order")
            .eq("campaign_id", c.id)
            .order("sort_order", { ascending: true });

          if (rErr) throw rErr;
          if (!cancelled) {
            setContestants((rows ?? []) as Contestant[]);
            setContestantId((rows?.[0]?.id as string) ?? "");
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        const parts = [
          e?.message,
          e?.details,
          e?.hint,
          e?.code ? `code=${e.code}` : null,
        ].filter(Boolean);
        setError(parts.length > 0 ? parts.join(" | ") : "Unable to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const total = useMemo(() => {
    if (!campaign) return 0;
    return Math.max(1, quantity) * campaign.unit_amount;
  }, [campaign, quantity]);

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setSubmitting(true);
    setError(null);

    try {
      const q = Math.max(1, Math.min(campaign.max_per_txn, Math.trunc(quantity)));
      if (!email.trim()) throw new Error("Email is required.");
      if (campaign.type === "vote" && !contestantId) throw new Error("Please select a contestant.");

      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: campaign.slug,
          email: email.trim(),
          quantity: q,
          contestant_id: campaign.type === "vote" ? contestantId : null,
        }),
      });

      const json = (await res.json()) as { authorization_url?: string; reference?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Payment initialization failed.");
      if (!json.authorization_url) throw new Error("Missing payment authorization URL.");

      // Redirect to Paystack checkout page
      window.location.href = json.authorization_url;
    } catch (e: any) {
      setError(e?.message ?? "Payment initialization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Campaign not available</h1>
            <p className="text-gray-600 mt-2">
              This link may be inactive or expired. If you believe this is an error, contact the organizer.
            </p>
            {error && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Debug info (local testing)</div>
                  <div className="text-sm mt-1 break-words">{error}</div>
                  <div className="text-xs text-gray-600 mt-2">
                    Common causes: the Supabase SQL hasn’t been run yet, the slug doesn’t exist, or RLS is hiding an
                    inactive/out-of-window campaign.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isVote = campaign.type === "vote";
  const Icon = isVote ? Vote : Ticket;

  return (
    <div className="pt-24 min-h-screen bg-gray-50">
      <div className="container-custom py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: campaign info */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center">
                <Icon className="w-5 h-5 text-primary-700" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{campaign.title}</h1>
                <p className="text-gray-600 mt-2">{campaign.description ?? "Complete payment to continue."}</p>
              </div>
            </div>

            {ref && (
              <div className="mt-6 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary-700 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Payment received (processing)</div>
                    <div className="text-gray-700 mt-1">
                      Your payment is being confirmed securely by webhook. Reference:{" "}
                      <span className="font-mono">{ref}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Do not refresh repeatedly—webhook confirmation may take a short moment depending on the provider.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isVote && contestants.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Contestants</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contestants.map((c) => (
                    <label
                      key={c.id}
                      className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 ${
                        contestantId === c.id ? "border-primary-600 bg-primary-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="contestant"
                        value={c.id}
                        checked={contestantId === c.id}
                        onChange={() => setContestantId(c.id)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        {c.image_url ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                          {c.description && <div className="text-sm text-gray-600 truncate">{c.description}</div>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: payment form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Pay</h2>
            <p className="text-gray-600 mt-1">
              Select quantity and proceed to checkout. Payment is confirmed only by webhook.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onPay} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isVote ? "Votes" : "Tickets"} quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={campaign.max_per_txn}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Max per transaction: {campaign.max_per_txn}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {campaign.currency} {total.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Unit: {campaign.currency} {campaign.unit_amount.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full btn-primary inline-flex items-center justify-center gap-2 ${submitting && "opacity-60"}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Proceed to checkout"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

