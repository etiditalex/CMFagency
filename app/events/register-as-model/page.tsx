"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, FileDown, Heart, Loader2, Upload } from "lucide-react";

// CFMA award categories – slugs must match campaigns in DB (run seed: ticketing_voting_mvp_patch_35_cfma_categories.sql)
const REGISTRATION_CATEGORIES: { slug: string; title: string }[] = [
  { slug: "rising-star-model-of-the-year", title: "Rising Star Model of the Year" },
  { slug: "most-talented-model-of-the-year", title: "Most Talented Model of the Year" },
  { slug: "best-pwd-model-of-the-year", title: "Best PWD Model of the Year" },
  { slug: "best-model-in-community-service", title: "Best Model in Community Service" },
  { slug: "muslim-model-of-the-year", title: "Muslim Model of the Year" },
  { slug: "most-influential-male-model-of-the-year", title: "Most Influential Male Model of the Year" },
  { slug: "most-influential-female-model-of-the-year", title: "Most Influential Female Model of the Year" },
  { slug: "high-fashion-model-of-the-year", title: "High Fashion Model of the Year" },
  { slug: "photogenic-model-of-the-year", title: "Photogenic Model of the Year" },
  { slug: "plus-size-model-of-the-year", title: "Plus Size Model of the Year" },
  { slug: "peoples-choice-award", title: "People's Choice Award" },
  { slug: "ambassador-of-coastal-heritage", title: "Ambassador of Coastal Heritage" },
  { slug: "best-master-of-ceremonies-mc-of-the-year", title: "Best Master of Ceremonies (MC) of the Year" },
  { slug: "best-spoken-word-artist-of-the-year", title: "Best Spoken Word Artist of the Year" },
  { slug: "best-dressed-creative-of-the-year", title: "Best Dressed Creative of the Year" },
  { slug: "best-makeup-artist-of-the-year", title: "Best Makeup Artist of the Year" },
  { slug: "best-fashion-stylist-of-the-year", title: "Best Fashion Stylist of the Year" },
  { slug: "best-fashion-house-of-the-year", title: "Best Fashion House of the Year" },
  { slug: "designer-of-the-year", title: "Designer of the Year" },
  { slug: "best-dj-of-the-year", title: "Best DJ of the Year" },
  { slug: "best-rapper-of-the-year", title: "Best Rapper of the Year" },
  { slug: "best-music-band-of-the-year", title: "Best Music Band of the Year" },
  { slug: "best-photographer-of-the-year", title: "Best Photographer of the Year" },
  { slug: "best-pageant-trainer-of-the-year", title: "Best Pageant Trainer of the Year" },
  { slug: "most-stylish-model-of-the-year", title: "Most Stylish Model of the Year" },
  { slug: "most-innovative-model-of-the-year", title: "Most Innovative Model of the Year" },
  { slug: "tiktoker-of-the-year", title: "TikToker of the Year" },
  { slug: "teen-model-of-the-year", title: "Teen Model of the Year" },
  { slug: "pageant-of-the-year", title: "Pageant of the Year" },
  { slug: "best-creative-agency-of-the-year", title: "Best Creative Agency of the Year" },
  { slug: "best-event-organizers-of-the-year", title: "Best Event Organizer(s) of the Year" },
  { slug: "dancer-dance-crew-of-the-year", title: "Dancer/Dance crew of the year" },
  { slug: "content-creator-influencer-of-the-year", title: "Content creator/influencer of the year" },
];

export default function RegisterAsModelPage() {
  const [categorySlug, setCategorySlug] = useState(REGISTRATION_CATEGORIES[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; votingLink?: string } | null>(null);

  // Certificate download section (name must match database; email = registration match or where we send the PDF)
  const [certName, setCertName] = useState("");
  const [certEmail, setCertEmail] = useState("");
  const [certCategorySlug, setCertCategorySlug] = useState(REGISTRATION_CATEGORIES[0]?.slug ?? "");
  const [certStatus, setCertStatus] = useState<{
    found: boolean;
    approved: boolean;
    downloaded_at: string | null;
    name?: string;
    category_title?: string;
  } | null>(null);
  const [certChecking, setCertChecking] = useState(false);
  const [certDownloading, setCertDownloading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [supportPaymentLoading, setSupportPaymentLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoFile(file ?? null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("campaign_slug", categorySlug);
      formData.set("name", name.trim());
      formData.set("email", email.trim().toLowerCase());
      if (photoFile) formData.set("photo", photoFile);

      const res = await fetch("/api/contestants/register", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((json as { error?: string }).error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess({
        message: (json as { message?: string }).message ?? "You're registered! Check your email for your voting campaign link.",
        votingLink: (json as { voting_link?: string }).voting_link,
      });
      setName("");
      setEmail("");
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCheckCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertError(null);
    setCertStatus(null);
    setCertChecking(true);
    try {
      const params = new URLSearchParams({
        name: certName.trim(),
        email: certEmail.trim().toLowerCase(),
        campaign_slug: certCategorySlug,
      });
      const res = await fetch(`/api/certificate/status?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCertError((data as { error?: string }).error ?? "Could not check status.");
        return;
      }
      if (!(data as { found?: boolean }).found) {
        setCertStatus(null);
        setCertError(
          (data as { error?: string }).error ?? "No registration found for this name and category."
        );
        return;
      }
      setCertStatus({
        found: (data as { found?: boolean }).found ?? false,
        approved: (data as { approved?: boolean }).approved ?? false,
        downloaded_at: (data as { downloaded_at?: string | null }).downloaded_at ?? null,
        name: (data as { name?: string }).name,
        category_title: (data as { category_title?: string }).category_title,
      });
    } catch {
      setCertError("Something went wrong. Please try again.");
    } finally {
      setCertChecking(false);
    }
  };

  const onSupportPayment = async () => {
    if (!certEmail.trim()) return;
    setCertError(null);
    setSupportPaymentLoading(true);
    try {
      const res = await fetch("/api/certificate/init-support-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: certEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCertError((data as { error?: string }).error ?? "Payment could not be started.");
        return;
      }
      const url = (data as { authorization_url?: string }).authorization_url;
      if (url) window.location.href = url;
    } catch {
      setCertError("Something went wrong. Please try again.");
    } finally {
      setSupportPaymentLoading(false);
    }
  };

  const onDownloadCertificate = async () => {
    if (!certName.trim() || !certEmail.trim() || !certCategorySlug) return;
    setCertError(null);
    setCertDownloading(true);
    try {
      const res = await fetch("/api/certificate/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: certName.trim(),
          email: certEmail.trim().toLowerCase(),
          campaign_slug: certCategorySlug,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCertError((data as { error?: string }).error ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CMFA-Certificate-${certStatus?.name?.replace(/[^a-zA-Z0-9-_]/g, "-") ?? "participation"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setCertStatus((prev) => (prev ? { ...prev, approved: true, downloaded_at: new Date().toISOString() } : null));
    } catch {
      setCertError("Download failed. Please try again.");
    } finally {
      setCertDownloading(false);
    }
  };

  const onCopyVotingLink = async () => {
    if (!success?.votingLink) return;
    try {
      await navigator.clipboard.writeText(success.votingLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError("Could not copy link automatically. Please copy it manually.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="container-custom pt-24 pb-12 md:pt-28 md:pb-16">
        <div className="max-w-xl mx-auto">
          {success ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="inline-flex w-14 h-14 rounded-full bg-green-100 items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">You&apos;re registered!</h2>
              <p className="mt-2 text-gray-600">{success.message}</p>
              {success.votingLink && (
                <div className="mt-4 text-left">
                  <p className="text-sm text-gray-700 font-medium mb-2">Your voting link (copy and share):</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={success.votingLink}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={onCopyVotingLink}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 whitespace-nowrap"
                    >
                      {linkCopied ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-amber-700">
                    Voting page opens in April. Save this link now and share it when voting starts.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="mt-6 px-6 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
              >
                Register another
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Contestant registration</h2>

              <form onSubmit={onSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category (where you compete)
                  </label>
                  <select
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    {REGISTRATION_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Your full name"
                      required
                    />
                  </div>

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
                    <p className="text-xs text-gray-500 mt-1">
                      Your voting campaign link will be sent to this email.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Upload className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {photoFile ? photoFile.name : "Choose photo"}
                        </span>
                        <input
                          type="file"
                          accept={ALLOWED_IMAGE_TYPES.join(",")}
                          onChange={onPhotoChange}
                          className="sr-only"
                        />
                      </label>
                      {photoPreview && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <Image
                            src={photoPreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      JPEG, PNG, GIF or WebP. Max 5MB. Optional but recommended.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Registering…
                      </>
                    ) : (
                      "Register and get my voting link"
                    )}
                  </button>
                </form>

              {/* Certificate of participation - for past contestants */}
              <div id="certificate" className="mt-10 scroll-mt-28 pt-8 border-t border-gray-200 md:scroll-mt-36">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Certificate of participation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your name exactly as it appears in our records for that category, and the email we should use (must match the one you registered with when we have it on file).
                </p>
                <form onSubmit={onCheckCertificate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={certName}
                      onChange={(e) => { setCertName(e.target.value); setCertStatus(null); setCertError(null); }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (registered address; certificate is sent here)</label>
                    <input
                      type="email"
                      value={certEmail}
                      onChange={(e) => { setCertEmail(e.target.value); setCertStatus(null); setCertError(null); }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={certCategorySlug}
                      onChange={(e) => { setCertCategorySlug(e.target.value); setCertStatus(null); setCertError(null); }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {REGISTRATION_CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  {certError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{certError}</div>
                  )}
                  {certStatus && (
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                      {!certStatus.found ? (
                        <p className="text-gray-700">No match for this name, email, and category.</p>
                      ) : certStatus.approved && certStatus.downloaded_at ? (
                        <p className="text-gray-700">Your certificate has already been issued (sent by email or downloaded). It can only be received once.</p>
                      ) : certStatus.approved ? (
                        <>
                          <p className="text-green-800 font-medium">You can download your certificate once. No duplicates.</p>
                          <div className="flex flex-wrap gap-3 items-center">
                            <button
                              type="button"
                              onClick={onDownloadCertificate}
                              disabled={certDownloading}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-60"
                            >
                              {certDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                              Download certificate (e-signed)
                            </button>
                          </div>
                          <div className="pt-3 mt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">Optional: Support our work with 200 Kenyan Shillings</p>
                            <button
                              type="button"
                              onClick={onSupportPayment}
                              disabled={supportPaymentLoading}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-600 text-primary-600 bg-white font-medium hover:bg-primary-50 disabled:opacity-60"
                            >
                              {supportPaymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                              Support with 200 KES (optional)
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-amber-800">Your certificate request is pending admin approval. You will be able to download once approved.</p>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={certChecking || !certEmail.trim() || !certName.trim()}
                    className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {certChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Check status / Get certificate
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
