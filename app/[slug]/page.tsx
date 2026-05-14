"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Ticket, Vote } from "lucide-react";

import VoteSuccessToast from "@/components/VoteSuccessToast";
import {
  GENERIC_CAMPAIGN_LOAD_FAILURE,
  GENERIC_PAYMENT_FAILURE,
  messageForPaymentFailure,
  PaymentClientError,
} from "@/lib/payment-user-message";
import { LIPA_POLE_POLE_MIN_KES } from "@/lib/lipa-pole-pole";

/** Match `/api/cfm-tickets/installment/plan` so plan phone equals STK phone. */
function normalizeKenyaPhoneForPlan(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0") && phoneRaw.length >= 10) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9 && /^[17]/.test(phoneRaw)) return `254${phoneRaw}`;
  return phoneRaw;
}

type Campaign = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
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
  created_at: string | null;
};

/** Used if `/api/voting-schedule` is unavailable (migration not applied yet). */
const FALLBACK_VOTING_START_MS = new Date("2026-04-01T00:00:00+03:00").getTime();
const VOTING_ENDS_AT_ISO = "2026-08-11T00:00:00+03:00";

function formatVotingOpensInNairobi(isoMs: number): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoMs));
  } catch {
    return "soon";
  }
}

function nairobiParts(d: Date): { y: number; m: number; day: number; hh: number; mm: number; ss: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const read = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { y: read("year"), m: read("month"), day: read("day"), hh: read("hour"), mm: read("minute"), ss: read("second") };
}

function toNairobiDate(d: Date): Date {
  const p = nairobiParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${p.y}-${pad(p.m)}-${pad(p.day)}T${pad(p.hh)}:${pad(p.mm)}:${pad(p.ss)}+03:00`);
}

function addMonthsClamped(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const hh = d.getUTCHours();
  const mm = d.getUTCMinutes();
  const ss = d.getUTCSeconds();
  const nextFirst = new Date(Date.UTC(y, m + months, 1, hh, mm, ss));
  const lastOfNext = new Date(Date.UTC(nextFirst.getUTCFullYear(), nextFirst.getUTCMonth() + 1, 0, hh, mm, ss));
  const clampedDay = Math.min(day, lastOfNext.getUTCDate());
  return new Date(Date.UTC(nextFirst.getUTCFullYear(), nextFirst.getUTCMonth(), clampedDay, hh, mm, ss));
}

function computeCountdown(now: Date, target: Date): { months: number; days: number; hours: number; minutes: number; seconds: number } {
  if (now.getTime() >= target.getTime()) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  // Work in Nairobi time using a stable +03:00 anchor.
  let cursor = toNairobiDate(now);
  const end = new Date(target.getTime());

  let months = 0;
  while (true) {
    const next = addMonthsClamped(cursor, 1);
    if (next.getTime() <= end.getTime()) {
      cursor = next;
      months += 1;
      continue;
    }
    break;
  }

  let ms = end.getTime() - cursor.getTime();
  const sec = 1000;
  const min = 60 * sec;
  const hr = 60 * min;
  const day = 24 * hr;

  const days = Math.floor(ms / day);
  ms -= days * day;
  const hours = Math.floor(ms / hr);
  ms -= hours * hr;
  const minutes = Math.floor(ms / min);
  ms -= minutes * min;
  const seconds = Math.floor(ms / sec);
  return { months, days, hours, minutes, seconds };
}

function VotingEndsCountdown({ show }: { show: boolean }) {
  const targetMs = useMemo(() => new Date(VOTING_ENDS_AT_ISO).getTime(), []);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!show) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [show]);

  if (!show) return null;

  const t = computeCountdown(new Date(nowMs), new Date(targetMs));
  const done = t.months + t.days + t.hours + t.minutes + t.seconds <= 0;
  const pad2 = (n: number) => String(n).padStart(2, "0");

  const items: Array<{ label: string; value: string }> = done
    ? [
        { label: "MONTHS", value: "00" },
        { label: "DAYS", value: "00" },
        { label: "HRS", value: "00" },
        { label: "MIN", value: "00" },
        { label: "SEC", value: "00" },
      ]
    : [
        { label: "MONTHS", value: String(t.months) },
        { label: "DAYS", value: String(t.days) },
        { label: "HRS", value: pad2(t.hours) },
        { label: "MIN", value: pad2(t.minutes) },
        { label: "SEC", value: pad2(t.seconds) },
      ];

  return (
    <div className="mb-4 rounded-2xl border border-primary-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
        <div className="text-[11px] tracking-[0.24em] font-extrabold text-primary-800">
          VOTING ENDS IN
        </div>
        <div className="flex items-center gap-2">
          {items.map((it) => (
            <div
              key={it.label}
              className="w-[62px] rounded-xl border border-primary-200 bg-primary-50 px-2.5 py-2 text-center"
            >
              <div className="text-lg font-extrabold text-gray-900 tabular-nums leading-none">{it.value}</div>
              <div className="mt-1 text-[10px] font-bold tracking-wider text-primary-800/80">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  const router = useRouter();
  const routeParams = useParams<{ slug?: string | string[] }>();
  const slug = useMemo(() => {
    const s = routeParams?.slug;
    if (Array.isArray(s)) return s[0] ?? "";
    return String(s ?? "");
  }, [routeParams?.slug]);
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") ?? null;
  const contestantPresetId = searchParams?.get("c") ?? null;

  const [txStatus, setTxStatus] = useState<
    null | {
      status: "pending" | "success" | "failed" | "abandoned" | string;
      verified_at: string | null;
      fulfilled_at: string | null;
      paid_at: string | null;
      currency: string | null;
      amount: number | null;
      quantity: number | null;
      campaign_type: "ticket" | "vote" | string | null;
      mpesa_receipt?: string | null;
      campaign_title?: string | null;
      campaign_slug?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
      email?: string | null;
      payer_name?: string | null;
    }
  >(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const receiptRequestedRef = useRef(false);
  const reminderRequestedRef = useRef(false);
  const voteSuccessToastFiredRef = useRef(false);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contestantId, setContestantId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "mpesa">("mpesa");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [lipaPayMode, setLipaPayMode] = useState<"full" | "installment">("full");
  const [lipaFirstPayKes, setLipaFirstPayKes] = useState("");
  const [votingStartMs, setVotingStartMs] = useState<number>(FALLBACK_VOTING_START_MS);
  const [voteSuccessToastShow, setVoteSuccessToastShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!slug) throw new Error();
        const res = await fetch(`/api/campaigns/${encodeURIComponent(slug)}/page-data`);
        const body = (await res.json()) as {
          error?: string;
          not_found?: boolean;
          campaign: Campaign | null;
          contestants?: Contestant[];
          vote_counts?: Record<string, number>;
          voting_starts_at?: string | null;
        };

        if (!res.ok) throw new Error();

        if (!body.campaign || body.not_found) {
          throw new Error();
        }

        if (cancelled) return;

        setCampaign(body.campaign);
        const list = (body.contestants ?? []) as Contestant[];
        setContestants(body.campaign.type === "vote" ? list : []);
        setContestantId("");
        if (body.campaign.type === "vote" && body.vote_counts && typeof body.vote_counts === "object") {
          setVoteCounts(body.vote_counts);
        } else {
          setVoteCounts({});
        }

        const iso = body.voting_starts_at;
        if (iso) {
          const t = Date.parse(iso);
          if (!Number.isNaN(t)) setVotingStartMs(t);
        }
      } catch {
        if (cancelled) return;
        setError(GENERIC_CAMPAIGN_LOAD_FAILURE);
        setCampaign(null);
        setContestants([]);
        setVoteCounts({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    setLipaPayMode("full");
    setLipaFirstPayKes("");
  }, [slug]);

  /** Optional `?c=` id for a hint only — selection still requires an explicit tap. */
  const linkSuggestedContestantId = useMemo(() => {
    if (!contestantPresetId) return null;
    return contestants.some((x) => x.id === contestantPresetId) ? contestantPresetId : null;
  }, [contestantPresetId, contestants]);

  useEffect(() => {
    if (loading || contestants.length === 0) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#vote-counts") return;
    const t = window.setTimeout(() => {
      document.getElementById("vote-counts")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => window.clearTimeout(t);
  }, [loading, slug, contestants.length]);

  // Fetch vote counts for vote campaigns (for competition visibility)
  const fetchVoteCounts = useMemo(() => {
    return async () => {
      if (!slug || !campaign || campaign.type !== "vote") return;
      try {
        const res = await fetch(`/api/campaigns/${encodeURIComponent(slug)}/vote-counts`);
        if (!res.ok) return;
        const { counts } = (await res.json()) as { counts?: Record<string, number> };
        if (counts && typeof counts === "object") setVoteCounts(counts);
      } catch {
        // Non-blocking
      }
    };
  }, [slug, campaign?.type]);

  useEffect(() => {
    if (!campaign || campaign.type !== "vote") return;
    // Initial tallies come from `page-data`; avoid an immediate second full aggregation on load.
    const interval = setInterval(fetchVoteCounts, 12_000);
    return () => clearInterval(interval);
  }, [campaign, fetchVoteCounts]);

  /** Right after Paystack/M-Pesa reports success, refresh public totals (don’t wait for the background poll). */
  useEffect(() => {
    if (txStatus?.status !== "success") return;
    if (campaign?.type !== "vote" || !slug) return;
    void fetchVoteCounts();
  }, [txStatus?.status, campaign?.type, slug, fetchVoteCounts]);

  /** Highest vote totals first; ties use sort_order then registration time (created_at). */
  const contestantsSorted = useMemo(() => {
    if (contestants.length === 0) return contestants;
    return [...contestants].sort((a, b) => {
      const va = voteCounts[a.id] ?? 0;
      const vb = voteCounts[b.id] ?? 0;
      if (vb !== va) return vb - va;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
  }, [contestants, voteCounts]);

  useEffect(() => {
    if (!ref) return;
    receiptRequestedRef.current = false;
    reminderRequestedRef.current = false;

    let cancelled = false;
    /** Browser timers are numeric IDs; `clearInterval` accepts them in the client bundle. */
    const pollRef: { id: number | undefined } = { id: undefined };

    const fetchStatus = async () => {
      try {
        let res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(ref)}`);
        let raw = await res.text();
        let json: any = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {
            json = {};
          }
        }
        if (!res.ok) throw new Error(json?.error ?? raw ?? "Unable to fetch payment status");

        if (
          String(json.status ?? "pending") === "pending" &&
          String(json.provider ?? "").toLowerCase() === "paystack"
        ) {
          await fetch("/api/paystack/verify-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref }),
          }).catch(() => {});
          res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(ref)}`);
          raw = await res.text();
          if (raw) {
            try {
              json = JSON.parse(raw);
            } catch {
              json = {};
            }
          }
          if (!res.ok) throw new Error(json?.error ?? raw ?? "Unable to fetch payment status");
        }

        if (
          String(json.status ?? "pending") === "pending" &&
          String(json.provider ?? "").toLowerCase() === "daraja"
        ) {
          await fetch("/api/daraja/verify-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref }),
          }).catch(() => {});
          res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(ref)}`);
          raw = await res.text();
          if (raw) {
            try {
              json = JSON.parse(raw);
            } catch {
              json = {};
            }
          }
          if (!res.ok) throw new Error(json?.error ?? raw ?? "Unable to fetch payment status");
        }

        const next = {
          status: String(json.status ?? "pending"),
          verified_at: (json.verified_at as string | null) ?? null,
          fulfilled_at: (json.fulfilled_at as string | null) ?? null,
          paid_at: (json.paid_at as string | null) ?? null,
          currency: (json.currency as string | null) ?? null,
          amount: (typeof json.amount === "number" ? (json.amount as number) : null) as number | null,
          quantity: (typeof json.quantity === "number" ? (json.quantity as number) : null) as number | null,
          campaign_type: (json.campaign_type as any) ?? null,
          mpesa_receipt: (json.mpesa_receipt as string | null) ?? null,
          campaign_title: (json.campaign_title as string | null) ?? null,
          campaign_slug: (json.campaign_slug as string | null) ?? null,
          starts_at: (json.starts_at as string | null) ?? null,
          ends_at: (json.ends_at as string | null) ?? null,
          email: (json.email as string | null) ?? null,
          payer_name: (json.payer_name as string | null) ?? null,
        };

        if (!cancelled) setTxStatus(next);

        if (next.status === "success") {
          if (!receiptRequestedRef.current) {
            receiptRequestedRef.current = true;
            fetch(`/api/send-receipt?ref=${encodeURIComponent(ref)}`, { method: "POST" }).catch(() => {});
          }
        }

        if (next.status === "failed" || next.status === "abandoned") {
          if (!reminderRequestedRef.current) {
            reminderRequestedRef.current = true;
            fetch("/api/send-purchase-reminder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ref }),
            }).catch(() => {});
          }
        }

        if (next.status === "success" || next.status === "failed" || next.status === "abandoned") {
          if (pollRef.id) window.clearInterval(pollRef.id);
        }
      } catch {
        // Non-fatal: keep polling briefly
      }
    };

    fetchStatus();
    pollRef.id = window.setInterval(fetchStatus, 2000) as number;

    const stopTimeout = window.setTimeout(() => {
      if (pollRef.id) window.clearInterval(pollRef.id);
    }, 300_000);

    return () => {
      cancelled = true;
      if (pollRef.id) window.clearInterval(pollRef.id);
      window.clearTimeout(stopTimeout);
    };
  }, [ref]);

  useEffect(() => {
    if (!ref) {
      voteSuccessToastFiredRef.current = false;
      setVoteSuccessToastShow(false);
      return;
    }
    if (txStatus?.status !== "success") return;
    const isVotePayment = txStatus.campaign_type === "vote" || campaign?.type === "vote";
    if (!isVotePayment) return;
    if (voteSuccessToastFiredRef.current) return;
    voteSuccessToastFiredRef.current = true;
    setVoteSuccessToastShow(true);
  }, [ref, txStatus?.status, txStatus?.campaign_type, campaign?.type]);

  const effectiveMax = useMemo(() => {
    if (!campaign) return 10;
    return campaign.type === "vote" ? 1000000 : Math.min(campaign.max_per_txn, 10000);
  }, [campaign]);
  const qty = useMemo(() => {
    if (!campaign) return 1;
    return Math.max(1, Math.min(effectiveMax, Math.trunc(quantity)));
  }, [campaign, quantity, effectiveMax]);
  const total = useMemo(() => {
    if (!campaign) return 0;
    return qty * campaign.unit_amount;
  }, [campaign, qty]);

  const allowLipa =
    campaign?.type === "ticket" &&
    String(campaign.currency ?? "").toUpperCase() === "KES" &&
    total >= LIPA_POLE_POLE_MIN_KES;

  const phoneNormPlan = useMemo(() => normalizeKenyaPhoneForPlan(phone), [phone]);

  const lipaDepositKes = Math.trunc(Number(lipaFirstPayKes.trim()) || 0);
  const lipaDepositOk =
    lipaPayMode !== "installment" ||
    (Number.isFinite(lipaDepositKes) &&
      lipaDepositKes >= LIPA_POLE_POLE_MIN_KES &&
      lipaDepositKes <= total);

  const isKes = String(campaign?.currency ?? "").toUpperCase() === "KES";
  // Show M-Pesa option for KES campaigns; backend will error if Daraja not configured
  const showMpesaOption = isKes;

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setSubmitting(true);
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms and Conditions before continuing.");
      setSubmitting(false);
      return;
    }

    try {
      const q = Math.max(1, Math.min(effectiveMax, Math.trunc(quantity)));
      if (campaign.type === "vote" && !contestantId) {
        throw new PaymentClientError("Please select a contestant.");
      }

      const payerName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;

      if (allowLipa && lipaPayMode === "installment") {
        const depositKes = Math.trunc(Number(lipaFirstPayKes.trim()));
        if (
          !Number.isFinite(depositKes) ||
          depositKes < LIPA_POLE_POLE_MIN_KES ||
          depositKes > total
        ) {
          throw new PaymentClientError(
            `Enter an amount between KES ${LIPA_POLE_POLE_MIN_KES.toLocaleString("en-KE")} and KES ${total.toLocaleString("en-KE")}.`
          );
        }
        if (!/^254[17]\d{8}$/.test(phoneNormPlan)) {
          throw new PaymentClientError(
            "Enter a valid Safaricom number (e.g. 254712345678) for Lipa Pole Pole."
          );
        }
        if (!email.trim()) throw new PaymentClientError("Email is required for Lipa Pole Pole.");
        const emailRegexLipa = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegexLipa.test(email.trim())) {
          throw new PaymentClientError("Please enter a valid email address.");
        }

        const planRes = await fetch("/api/cfm-tickets/installment/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: campaign.slug,
            email: email.trim(),
            phone: phoneNormPlan,
            payer_name: payerName,
            ticket_quantity: q,
          }),
        });
        const planJson = (await planRes.json()) as { plan_id?: string; error?: string };
        if (!planRes.ok || !planJson.plan_id) {
          throw new PaymentClientError(planJson.error ?? "Could not start Lipa Pole Pole plan.");
        }
        const planId = planJson.plan_id;

        if (paymentMethod === "mpesa" && isKes) {
          const res = await fetch("/api/daraja/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: campaign.slug,
              phone: phoneNormPlan,
              email: email.trim(),
              payer_name: payerName,
              quantity: q,
              contestant_id: null,
              lipa_pole_pole_plan_id: planId,
              lipa_pole_pole_deposit_kes: depositKes,
            }),
          });
          const rawLipa = await res.text();
          let jsonLipa: { reference?: string; error?: string } = {};
          if (rawLipa) {
            try {
              jsonLipa = JSON.parse(rawLipa);
            } catch {
              /* non-JSON */
            }
          }
          if (!res.ok) {
            throw new PaymentClientError(jsonLipa.error ?? "M-Pesa payment could not be started.");
          }
          if (jsonLipa.reference) {
            router.replace(`/receipt?ref=${encodeURIComponent(jsonLipa.reference)}`);
          }
          return;
        }

        const useInlineLipa = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        const resLipa = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: campaign.slug,
            email: email.trim(),
            payer_name: payerName,
            quantity: q,
            contestant_id: null,
            inline: useInlineLipa,
            lipa_pole_pole_plan_id: planId,
            lipa_pole_pole_deposit_kes: depositKes,
          }),
        });

        const rawPs = await resLipa.text();
        let jsonPs: {
          authorization_url?: string;
          reference?: string;
          amount_subunit?: number;
          email?: string;
          currency?: string;
          error?: string;
        } = {};
        if (rawPs) {
          try {
            jsonPs = JSON.parse(rawPs) as typeof jsonPs;
          } catch {
            /* non-JSON */
          }
        }

        if (!resLipa.ok) {
          throw new PaymentClientError(jsonPs.error ?? "Card payment could not be started.");
        }

        if (useInlineLipa && jsonPs.reference && jsonPs.amount_subunit != null && jsonPs.email && jsonPs.currency) {
          const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;
          const { default: PaystackPop } = await import("@paystack/inline-js");
          const paystack = new PaystackPop();
          paystack.newTransaction({
            key: paystackKey,
            email: jsonPs.email,
            amount: jsonPs.amount_subunit,
            currency: jsonPs.currency,
            reference: jsonPs.reference,
            channels: ["card", "mobile_money"],
            onSuccess: () => {
              router.replace(`/receipt?ref=${encodeURIComponent(jsonPs.reference!)}`);
            },
            onCancel: () => {
              setSubmitting(false);
            },
            onError: () => {
              setError(GENERIC_PAYMENT_FAILURE);
              setSubmitting(false);
            },
          });
          return;
        }

        if (jsonPs.authorization_url) {
          window.location.href = jsonPs.authorization_url;
          return;
        }

        throw new PaymentClientError(jsonPs.error ?? "Card payment could not be started.");
      }

      if (paymentMethod === "mpesa" && isKes) {
        if (!phone.trim()) {
          throw new PaymentClientError("M-Pesa number is required (e.g. 254712345678)");
        }
        if (!email.trim()) throw new PaymentClientError("Email is required to send your receipt.");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new PaymentClientError("Please enter a valid email address.");
        }
        const res = await fetch("/api/daraja/stk-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: campaign.slug,
            phone: phone.trim(),
            email: email.trim(),
            payer_name: payerName,
            quantity: q,
            contestant_id: campaign.type === "vote" ? contestantId : null,
          }),
        });
        const raw = await res.text();
        let json: { reference?: string; error?: string } = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {}
        }
        if (!res.ok) {
          throw new PaymentClientError(json.error ?? "M-Pesa payment could not be started.");
        }
         if (json.reference) {
          const receiptQ =
            campaign.type === "vote"
              ? `ref=${encodeURIComponent(json.reference)}&vote=1&slug=${encodeURIComponent(campaign.slug)}`
              : `ref=${encodeURIComponent(json.reference)}`;
          router.replace(`/receipt?${receiptQ}`);
        }
        return;
      }

      if (!email.trim()) throw new PaymentClientError("Email is required.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new PaymentClientError("Please enter a valid email address.");
      }

      const useInline = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: campaign.slug,
          email: email.trim(),
          payer_name: payerName,
          quantity: q,
          contestant_id: campaign.type === "vote" ? contestantId : null,
          inline: useInline,
        }),
      });

      const raw = await res.text();
      let json: {
        authorization_url?: string;
        reference?: string;
        amount_subunit?: number;
        email?: string;
        currency?: string;
        error?: string;
        details?: string;
      } = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          /* non-JSON */
        }
      }

      if (!res.ok) {
        throw new PaymentClientError(json.error ?? "Card payment could not be started.");
      }

      if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
        const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;
        const { default: PaystackPop } = await import("@paystack/inline-js");
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: paystackKey,
          email: json.email,
          amount: json.amount_subunit,
          currency: json.currency,
          reference: json.reference,
          channels: ["card", "mobile_money"],
          onSuccess: () => {
            const receiptQ =
              campaign.type === "vote"
                ? `ref=${encodeURIComponent(json.reference!)}&vote=1&slug=${encodeURIComponent(campaign.slug)}`
                : `ref=${encodeURIComponent(json.reference!)}`;
            router.replace(`/receipt?${receiptQ}`);
          },
          onCancel: () => {
            setSubmitting(false);
          },
          onError: () => {
            setError(GENERIC_PAYMENT_FAILURE);
            setSubmitting(false);
          },
        });
        return;
      }

      if (json.authorization_url) {
        window.location.href = json.authorization_url;
        return;
      }

      throw new PaymentClientError(json.error ?? "Card payment could not be started.");
    } catch (e: unknown) {
      setError(messageForPaymentFailure(e));
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
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isVote = campaign.type === "vote";
  const votingLocked = isVote && Date.now() < votingStartMs;
  const votingOpensLabel = formatVotingOpensInNairobi(votingStartMs);
  const Icon = isVote ? Vote : Ticket;

  const goVoteAgain = () => {
    setContestantId("");
    setAgreedToTerms(false);
    receiptRequestedRef.current = false;
    reminderRequestedRef.current = false;
    voteSuccessToastFiredRef.current = false;
    setVoteSuccessToastShow(false);
    router.replace(`/${slug}`);
  };

  const scrollToVoteCounts = () => {
    document.getElementById("vote-counts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (votingLocked) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-start gap-3">
              <div>
                <VotingEndsCountdown show />
                <h1 className="text-2xl font-bold text-gray-900">Voting opens {votingOpensLabel}</h1>
                <p className="text-gray-600 mt-2">
                  This voting page is not open yet. Please come back when voting starts (East Africa Time).
                </p>
                <p className="text-sm text-gray-500 mt-3">Link is valid and will work once voting opens.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-50">
      <div className="container-custom py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: campaign info */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            {campaign.image_url && (
              <div className="mb-6 -mx-6 -mt-6 rounded-t-xl overflow-hidden">
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </div>
            )}
            <div className="flex items-start gap-3">
              {!isVote && (
                <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-700" />
                </span>
              )}
              <div className="min-w-0">
                <VotingEndsCountdown show={isVote} />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{campaign.title}</h1>
                <p className="text-gray-600 mt-2">{campaign.description ?? "Complete payment to continue."}</p>
              </div>
            </div>

            {ref && (
              <div className="mt-6">
                {txStatus?.status === "success" ? (
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-secondary-700 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 text-lg">
                          {txStatus?.campaign_type === "vote" || isVote ? "Thank you for voting" : "Payment confirmed"}
                        </div>
                        <div className="text-gray-700 mt-2">
                          {(txStatus?.campaign_type === "vote" || isVote) && (
                            <span className="block font-medium text-green-800 mb-2">
                              Your payment was successfully processed — your votes are counted and a receipt is on its
                              way to your email.
                            </span>
                          )}
                          {!(txStatus?.campaign_type === "vote" || isVote) && (
                            <span>
                              Your receipt has been sent to your email with your ticket details.
                            </span>
                          )}
                          {(txStatus?.campaign_type === "vote" || isVote) && (
                            <span className="text-gray-600">Reference below confirms this payment.</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Reference: <span className="font-mono">{ref}</span>
                        </div>
                        {isVote && (
                          <div className="mt-5 pt-4 border-t border-secondary-200/80">
                            <p className="text-sm font-semibold text-gray-900">What would you like to do next?</p>
                            <div className="mt-3 flex flex-col sm:flex-row gap-3">
                              <button
                                type="button"
                                onClick={goVoteAgain}
                                className="flex-1 rounded-lg bg-primary-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                              >
                                Vote again
                              </button>
                              <button
                                type="button"
                                onClick={scrollToVoteCounts}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                              >
                                View votes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : txStatus?.status === "failed" || txStatus?.status === "abandoned" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900">Payment not successful</div>
                        <div className="text-gray-700 mt-1">
                          Try again or contact us if you need help. Reference:{" "}
                          <span className="font-mono">{ref}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                    <div className="flex items-start gap-3">
                      <Loader2 className="w-5 h-5 text-secondary-700 mt-0.5 animate-spin" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900">
                          {isVote ? "Confirming your payment" : "Payment received (processing)"}
                        </div>
                        <div className="text-gray-700 mt-1">
                          Your payment is being confirmed securely by webhook. Reference:{" "}
                          <span className="font-mono">{ref}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Do not refresh repeatedly — confirmation may take a short moment. Confirmation and your full
                          receipt details will appear here once processing completes.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isVote && contestants.length > 0 && (
              <div className="mt-6" id="vote-counts">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Contestants</h2>
                <p className="text-sm text-gray-600 mb-3">
                  <strong className="text-gray-800">Choose who you are voting for</strong> (required before paying). Counts update in real
                  time so you can see who&apos;s leading.
                </p>
                {linkSuggestedContestantId && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    You opened a link supporting{" "}
                    <strong>{contestants.find((x) => x.id === linkSuggestedContestantId)?.name ?? "a contestant"}</strong>.{" "}
                    They are not pre-selected — tap their card below if that&apos;s who you want to vote for.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contestantsSorted.map((c) => {
                    const votes = voteCounts[c.id] ?? 0;
                    const isSuggested = linkSuggestedContestantId === c.id;
                    return (
                      <label
                        key={c.id}
                        className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 ${
                          contestantId === c.id
                            ? "border-primary-600 bg-primary-50"
                            : isSuggested
                              ? "border-amber-300 bg-amber-50/40 border-dashed"
                              : "border-gray-200 bg-white"
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
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {c.image_url ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 break-words flex flex-wrap items-center gap-2">
                              {c.name}
                              {isSuggested && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  From link
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-primary-600 mt-0.5">
                              {votes.toLocaleString()} vote{votes !== 1 ? "s" : ""}
                            </div>
                            {c.description && <div className="text-sm text-gray-600 break-words line-clamp-2">{c.description}</div>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: payment form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Pay</h2>
            <p className="text-gray-600 mt-1">
              Choose your payment method. Payment is confirmed securely by webhook.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onPay} className="mt-6 space-y-4">
              {showMpesaOption && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
                  <div className="flex gap-3">
                    <label
                      className={`flex-1 cursor-pointer rounded-lg border p-3 flex items-center justify-center gap-2 ${
                        paymentMethod === "mpesa" ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="mpesa"
                        checked={paymentMethod === "mpesa"}
                        onChange={() => setPaymentMethod("mpesa")}
                        className="sr-only"
                      />
                      <Image
                        src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479160/M-PESA-logo-2_phv5ni.png"
                        alt="M-Pesa"
                        width={80}
                        height={28}
                        className="h-7 w-auto object-contain"
                      />
                    </label>
                    <label
                      className={`flex-1 cursor-pointer rounded-lg border p-3 flex items-center justify-center gap-2 ${
                        paymentMethod === "paystack" ? "border-primary-600 bg-primary-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paystack"
                        checked={paymentMethod === "paystack"}
                        onChange={() => setPaymentMethod("paystack")}
                        className="sr-only"
                      />
                      <Image
                        src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/visa_x5rgq6.svg"
                        alt="Visa"
                        width={48}
                        height={16}
                        className="h-4 w-auto object-contain"
                      />
                      <Image
                        src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/mastercard_gvjys4.svg"
                        alt="Mastercard"
                        width={36}
                        height={28}
                        className="h-5 w-auto object-contain"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentMethod === "mpesa"
                      ? "Enter your M-Pesa number. You’ll receive a prompt on your phone."
                      : "Pay with Visa, Mastercard, or Airtel Money via Paystack."}
                  </p>
                </div>
              )}

              {!showMpesaOption && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-sm text-gray-700">
                    Pay with <strong>Visa</strong>, <strong>Mastercard</strong>, <strong>M-Pesa</strong>, or{" "}
                    <strong>Airtel Money</strong>.
                  </p>
                </div>
              )}
              {showMpesaOption && paymentMethod === "paystack" && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Pay with Card</strong> — Visa, Mastercard, or Airtel Money via Paystack.
                  </p>
                </div>
              )}

              {paymentMethod === "mpesa" && showMpesaOption && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="254712345678"
                    required={paymentMethod === "mpesa"}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 254XXXXXXXXX (e.g. 254712345678)</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email {paymentMethod === "mpesa" ? "(optional, for receipt)" : ""}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                  required={paymentMethod !== "mpesa"}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {paymentMethod === "mpesa"
                    ? "We'll send your receipt here. Optional but recommended."
                    : process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                      ? "A secure popup will open to choose your payment method and complete payment."
                      : "You will be redirected to Paystack to choose your payment method."}
                </p>
              </div>

              {submitting && (
                <div className="p-4 rounded-lg border border-primary-200 bg-primary-50 text-primary-900">
                  <div className="font-extrabold">Handling Payment</div>
                  <div className="mt-1 text-sm text-primary-900/90">
                    {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                      ? "Choose your payment method and complete payment in the secure popup."
                      : "Redirecting you to complete payment securely..."}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isVote ? "Votes" : "Tickets"} quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={effectiveMax}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {campaign.type === "vote" ? "No maximum — buy as many votes as you want (up to 1,000,000)" : `Max per transaction: ${effectiveMax.toLocaleString()}`}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {campaign.currency} {total.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {allowLipa && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <div className="font-semibold text-gray-900">How would you like to pay?</div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="campaignLipaMode"
                      checked={lipaPayMode === "full"}
                      onChange={() => {
                        setLipaPayMode("full");
                        setLipaFirstPayKes("");
                      }}
                      className="mt-1 w-4 h-4 text-emerald-700 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-800 leading-snug">
                      <span className="font-semibold">Pay full amount now</span> — {campaign.currency}{" "}
                      {total.toLocaleString()} in one payment.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="campaignLipaMode"
                      checked={lipaPayMode === "installment"}
                      onChange={() => {
                        setLipaPayMode("installment");
                        setLipaFirstPayKes((prev) => {
                          if (prev.trim()) return prev;
                          const suggest = Math.min(
                            total,
                            Math.max(LIPA_POLE_POLE_MIN_KES, Math.floor(total / 4))
                          );
                          return String(suggest);
                        });
                      }}
                      className="mt-1 w-4 h-4 text-emerald-700 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-800 leading-snug">
                      <span className="font-semibold">Lipa Pole Pole</span> — pay part now (min KES{" "}
                      {LIPA_POLE_POLE_MIN_KES.toLocaleString("en-KE")}), then the rest later. Email reminders every 3
                      days if you still owe. Top up on the{" "}
                      <a
                        href="/kcm/cfm-tickets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-700 font-semibold underline"
                      >
                        CFM Tickets
                      </a>{" "}
                      page with the same email and phone.
                    </span>
                  </label>
                  {lipaPayMode === "installment" && (
                    <div className="pt-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Amount to pay now ({campaign.currency})
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={LIPA_POLE_POLE_MIN_KES}
                        max={total}
                        value={lipaFirstPayKes}
                        onChange={(e) => setLipaFirstPayKes(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-emerald-300 rounded-lg text-gray-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Between {LIPA_POLE_POLE_MIN_KES.toLocaleString("en-KE")} and {total.toLocaleString("en-KE")}{" "}
                        (your total for this checkout).
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    Terms and Conditions
                  </a>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || (allowLipa && lipaPayMode === "installment" && !lipaDepositOk)}
                className={`w-full btn-primary inline-flex items-center justify-center gap-2 ${submitting && "opacity-60"}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {paymentMethod === "mpesa"
                      ? "Check your phone for M-Pesa prompt..."
                      : process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                        ? "Complete payment in popup..."
                        : "Redirecting to payment..."}
                  </>
                ) : paymentMethod === "mpesa" && showMpesaOption ? (
                  <>
                    <Image
                      src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479160/M-PESA-logo-2_phv5ni.png"
                      alt=""
                      width={64}
                      height={22}
                      className="h-[22px] w-auto shrink-0 object-contain brightness-0 invert"
                      aria-hidden
                    />
                    <span className="text-white font-semibold">Submit</span>
                  </>
                ) : (
                  <>
                    <Image
                      src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/visa_x5rgq6.svg"
                      alt=""
                      width={36}
                      height={12}
                      className="h-4 w-auto shrink-0 object-contain brightness-0 invert opacity-90"
                      aria-hidden
                    />
                    <Image
                      src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/mastercard_gvjys4.svg"
                      alt=""
                      width={28}
                      height={22}
                      className="h-5 w-auto shrink-0 object-contain brightness-0 invert opacity-90"
                      aria-hidden
                    />
                    <span className="text-white font-semibold">Submit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <VoteSuccessToast show={voteSuccessToastShow} />
    </div>
  );
}
