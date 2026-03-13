"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Loader2, Upload, Vote } from "lucide-react";

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
                <p className="mt-4">
                  <a
                    href={success.votingLink}
                    className="text-primary-600 font-semibold hover:underline"
                  >
                    Open your voting page
                  </a>
                </p>
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
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center">
                  <Vote className="w-5 h-5 text-primary-700" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">Contestant registration</h2>
              </div>

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
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
