"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessagesSquare, Send } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Campaign = { id: string; title: string; type: string };

export default function DashboardEmailPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isAdmin } = usePortal();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("email")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("campaigns")
          .select("id,title,type")
          .order("created_at", { ascending: false });
        if (!isAdmin) q = q.eq("created_by", user.id);
        const { data, error: e } = await q;
        if (e) throw e;
        if (!cancelled) setCampaigns((data ?? []) as Campaign[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setRecipientCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const { data, error: e } = await supabase
          .from("transactions")
          .select("email")
          .eq("campaign_id", selectedCampaignId)
          .eq("status", "success")
          .not("email", "is", null);
        if (e) throw e;
        const emails = new Set((data ?? []).map((r: { email?: string }) => (r.email ?? "").trim().toLowerCase()).filter(Boolean));
        if (!cancelled) setRecipientCount(emails.size);
      } catch {
        if (!cancelled) setRecipientCount(0);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedCampaignId]);

  const canSend = useMemo(() => {
    return selectedCampaignId && subject.trim() && body.trim() && recipientCount > 0 && !sending;
  }, [selectedCampaignId, subject, body, recipientCount, sending]);

  const handleSend = async () => {
    if (!canSend || !user) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch("/api/campaigns/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);

      setSuccess(`Sent to ${json.sent} of ${json.total} recipients.`);
      if (json.errors?.length) setError(`Some failed: ${json.errors.slice(0, 3).join("; ")}${json.errors.length > 3 ? "…" : ""}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("email")) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Campaign communications</h2>
          <p className="mt-1 text-gray-600 text-left max-w-3xl">
            Send emails to voters (voting campaigns) or ticket buyers (ticketing campaigns). Recipients are from successful transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
          >
            Campaigns
          </Link>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`mt-6 p-4 rounded-md ${error ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-800"}`}
        >
          {error ? error : success}
        </div>
      )}

      <div className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading}
          >
            <option value="">Select a campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.type})
              </option>
            ))}
          </select>
          {selectedCampaignId && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">{recipientCount}</span> recipient{recipientCount !== 1 ? "s" : ""} (unique emails from successful payments)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Thank you for voting!"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Write your message here. Plain text is fine."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
          {recipientCount === 0 && selectedCampaignId && (
            <p className="text-sm text-amber-600">No recipients yet. Wait for successful payments with email addresses.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-gray-500 text-sm">
        <MessagesSquare className="w-4 h-4" />
        Emails are sent via Resend. Ensure <code className="bg-gray-100 px-1 rounded">RESEND_API_KEY</code> is configured.
      </div>
    </div>
  );
}
