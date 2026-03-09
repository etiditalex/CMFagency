"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, MessagesSquare, Send } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Campaign = { id: string; title: string; type: string; slug?: string };

export default function DashboardEmailPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [attachments, setAttachments] = useState<{ filename: string; content: string }[]>([]);
  const [greetingSubtext, setGreetingSubtext] = useState("");
  const [sectionHeading, setSectionHeading] = useState("");
  const [sectionLinkLabel, setSectionLinkLabel] = useState("");
  const [sectionLinkUrl, setSectionLinkUrl] = useState("");

  const [marketingEmails, setMarketingEmails] = useState("");
  const [marketingTitle, setMarketingTitle] = useState("");
  const [marketingSubject, setMarketingSubject] = useState("");
  const [marketingBody, setMarketingBody] = useState("");
  const [marketingSending, setMarketingSending] = useState(false);
  const [marketingError, setMarketingError] = useState<string | null>(null);
  const [marketingSuccess, setMarketingSuccess] = useState<string | null>(null);
  const [marketingImageUrl, setMarketingImageUrl] = useState("");
  const [marketingAttachments, setMarketingAttachments] = useState<{ filename: string; content: string }[]>([]);
  const [marketingGreetingSubtext, setMarketingGreetingSubtext] = useState("");
  const [marketingSectionHeading, setMarketingSectionHeading] = useState("");
  const [marketingSectionLinkLabel, setMarketingSectionLinkLabel] = useState("");
  const [marketingSectionLinkUrl, setMarketingSectionLinkUrl] = useState("");

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
          .select("id,title,type,slug")
          .order("created_at", { ascending: false });
        if (!isFullAdmin) q = q.eq("created_by", user.id);
        const { data, error: e } = await q;
        if (e) throw e;
        const rows = (data ?? []) as Campaign[];
        if (!cancelled) setCampaigns(rows.filter((c) => (c.slug ?? "").toLowerCase() !== "merchandise"));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, isFullAdmin]);

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

  const MAX_ATTACHMENTS = 5;
  const MAX_ATTACHMENT_MB = 4;

  const readFilesAsBase64 = (files: FileList | null): Promise<{ filename: string; content: string }[]> => {
    if (!files?.length) return Promise.resolve([]);
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxBytes = MAX_ATTACHMENT_MB * 1024 * 1024;
    return Promise.all(
      Array.from(files)
        .filter((f) => allowedTypes.includes(f.type) && f.size <= maxBytes)
        .slice(0, MAX_ATTACHMENTS)
        .map(
          (file) =>
            new Promise<{ filename: string; content: string }>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => {
                const b64 = (r.result as string)?.split(",")?.[1];
                resolve({ filename: file.name, content: b64 ?? "" });
              };
              r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
              r.readAsDataURL(file);
            })
        )
    );
  };

  const parseMarketingEmails = (text: string): string[] => {
    return [
      ...new Set(
        text
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];
  };
  const marketingRecipientCount = useMemo(() => parseMarketingEmails(marketingEmails).length, [marketingEmails]);
  const canSendMarketing = useMemo(() => {
    return marketingRecipientCount > 0 && marketingSubject.trim() && marketingBody.trim() && !marketingSending;
  }, [marketingRecipientCount, marketingSubject, marketingBody, marketingSending]);

  const handleSendMarketing = async () => {
    if (!canSendMarketing || !user) return;
    setMarketingSending(true);
    setMarketingError(null);
    setMarketingSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");
      const emails = parseMarketingEmails(marketingEmails);
      const res = await fetch("/api/campaigns/send-marketing-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          emails,
          subject: marketingSubject.trim(),
          body: marketingBody.trim(),
          title: marketingTitle.trim() || "CMF Agency",
          image_url: marketingImageUrl.trim() || undefined,
          greeting_subtext: marketingGreetingSubtext.trim() || undefined,
          section_heading: marketingSectionHeading.trim() || undefined,
          section_link_label: marketingSectionLinkLabel.trim() || undefined,
          section_link_url: marketingSectionLinkUrl.trim() || undefined,
          attachments: marketingAttachments.length ? marketingAttachments : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);
      setMarketingSuccess(`Sent to ${json.sent} of ${json.total} recipients.`);
      if (json.errors?.length) {
        setMarketingError(`Some failed: ${json.errors.slice(0, 3).join("; ")}${json.errors.length > 3 ? "…" : ""}`);
      }
    } catch (e: any) {
      setMarketingError(e?.message ?? "Failed to send emails");
    } finally {
      setMarketingSending(false);
    }
  };

  const handleSend = async () => {
    if (!canSend || !user) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch("/api/campaigns/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          subject: subject.trim(),
          body: body.trim(),
          image_url: imageUrl.trim() || undefined,
          greeting_subtext: greetingSubtext.trim() || undefined,
          section_heading: sectionHeading.trim() || undefined,
          section_link_label: sectionLinkLabel.trim() || undefined,
          section_link_url: sectionLinkUrl.trim() || undefined,
          attachments: attachments.length ? attachments : undefined,
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Greeting subtext (optional)</label>
            <input
              type="text"
              value={greetingSubtext}
              onChange={(e) => setGreetingSubtext(e.target.value)}
              placeholder="e.g. We've discovered new events for you!"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section heading (optional)</label>
            <input
              type="text"
              value={sectionHeading}
              onChange={(e) => setSectionHeading(e.target.value)}
              placeholder="e.g. Events specially curated for you ✨"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section link label (optional)</label>
            <input
              type="text"
              value={sectionLinkLabel}
              onChange={(e) => setSectionLinkLabel(e.target.value)}
              placeholder="e.g. Explore all"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section link URL (optional)</label>
            <input
              type="url"
              value={sectionLinkUrl}
              onChange={(e) => setSectionLinkUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Banner image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (image appears in the dark header, right side)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Attach images (optional)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={async (e) => {
              const list = await readFilesAsBase64(e.target.files);
              setAttachments(list);
              e.target.value = "";
            }}
            className="w-full max-w-md text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-gray-50 file:font-medium"
          />
          <p className="mt-1 text-sm text-gray-500">
            Up to {MAX_ATTACHMENTS} images, max {MAX_ATTACHMENT_MB} MB each (JPEG, PNG, GIF, WebP). {attachments.length > 0 && `${attachments.length} attached.`}
          </p>
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

      <div className="mt-10 border-t border-gray-200 pt-10">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Marketing campaign (custom list)
        </h3>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Send to a list of emails you provide — e.g. partners, prospects, or a custom list. Use for event invitations, partnership outreach, or ticket promotions.
        </p>

        {(marketingError || marketingSuccess) && (
          <div
            className={`mt-4 p-4 rounded-md ${marketingError ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-800"}`}
          >
            {marketingError ?? marketingSuccess}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient emails</label>
            <textarea
              value={marketingEmails}
              onChange={(e) => setMarketingEmails(e.target.value)}
              rows={4}
              placeholder={"One email per line, or comma/semicolon separated\ne.g. partner@example.com, buyer@example.com"}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              {marketingRecipientCount} valid email{marketingRecipientCount !== 1 ? "s" : ""} (max 500 per send)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email title (optional)</label>
            <input
              type="text"
              value={marketingTitle}
              onChange={(e) => setMarketingTitle(e.target.value)}
              placeholder="e.g. Event Name or Partner with us"
              className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={marketingSubject}
              onChange={(e) => setMarketingSubject(e.target.value)}
              placeholder="e.g. Partner with us for Event Name / Buy tickets now"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={marketingBody}
              onChange={(e) => setMarketingBody(e.target.value)}
              rows={8}
              placeholder="Write your message. You can invite partners, promote the event, or share a ticket link."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Greeting subtext (optional)</label>
              <input
                type="text"
                value={marketingGreetingSubtext}
                onChange={(e) => setMarketingGreetingSubtext(e.target.value)}
                placeholder="e.g. We've discovered new events for you!"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section heading (optional)</label>
              <input
                type="text"
                value={marketingSectionHeading}
                onChange={(e) => setMarketingSectionHeading(e.target.value)}
                placeholder="e.g. Events specially curated for you ✨"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section link label (optional)</label>
              <input
                type="text"
                value={marketingSectionLinkLabel}
                onChange={(e) => setMarketingSectionLinkLabel(e.target.value)}
                placeholder="e.g. Explore all"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section link URL (optional)</label>
              <input
                type="url"
                value={marketingSectionLinkUrl}
                onChange={(e) => setMarketingSectionLinkUrl(e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banner image URL (optional)</label>
            <input
              type="url"
              value={marketingImageUrl}
              onChange={(e) => setMarketingImageUrl(e.target.value)}
              placeholder="https://… (image appears in the dark header, right side)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attach images (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={async (e) => {
                const list = await readFilesAsBase64(e.target.files);
                setMarketingAttachments(list);
                e.target.value = "";
              }}
              className="w-full max-w-md text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-gray-50 file:font-medium"
            />
            <p className="mt-1 text-sm text-gray-500">
              Up to {MAX_ATTACHMENTS} images, max {MAX_ATTACHMENT_MB} MB each. {marketingAttachments.length > 0 && `${marketingAttachments.length} attached.`}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleSendMarketing}
              disabled={!canSendMarketing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {marketingSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {marketingRecipientCount} recipient{marketingRecipientCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-gray-500 text-sm">
        <MessagesSquare className="w-4 h-4" />
        Emails are sent via Resend. Ensure <code className="bg-gray-100 px-1 rounded">RESEND_API_KEY</code> is configured.
      </div>
    </div>
  );
}
