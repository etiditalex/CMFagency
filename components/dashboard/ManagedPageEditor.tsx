"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, ChevronLeft, Save, Trash2, Briefcase, GraduationCap, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { getManagedRoute } from "@/lib/managedPagesRoutes";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

function normalizeLines(input: string) {
  return input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function ManagedPageEditor({ route }: { route: string }) {
  const router = useRouter();
  const managed = useMemo(() => getManagedRoute(route), [route]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [heroLabel, setHeroLabel] = useState("");
  const [description, setDescription] = useState("");
  const [featuresTitle, setFeaturesTitle] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [benefitsTitle, setBenefitsTitle] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaDescription, setCtaDescription] = useState("");
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!managed) {
        setLoading(false);
        setError("This route is not mapped to the Pages editor yet.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Session expired. Please sign in again.");

        const res = await fetch(`/api/pages/get?route=${encodeURIComponent(route)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as { page?: any; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load page");

        const page = json.page ?? null;
        if (page) {
          if (cancelled) return;
          setExisting(true);
          setTitle(String(page.title ?? ""));
          setHeroLabel(String(page.hero_label ?? ""));
          setDescription(String(page.description ?? ""));
          setFeaturesTitle(String(page.features_title ?? ""));
          setFeaturesText(Array.isArray(page.features) ? page.features.map((x: any) => String(x)).join("\n") : "");
          setBenefitsTitle(String(page.benefits_title ?? ""));
          setBenefitsText(Array.isArray(page.benefits) ? page.benefits.map((x: any) => String(x)).join("\n") : "");
          setCtaTitle(String(page.cta_title ?? ""));
          setCtaDescription(String(page.cta_description ?? ""));
        } else {
          if (cancelled) return;
          setExisting(false);
          // Defaults for create.
          const defaultTitle = managed.section === "services" ? "Services Page" : "Careers Page";
          setTitle(defaultTitle);
          setHeroLabel(managed.section.toUpperCase());
          setDescription("");
          setFeaturesTitle("FEATURES");
          setFeaturesText("");
          setBenefitsTitle("BENEFITS");
          setBenefitsText("");
          setCtaTitle("Get Started");
          setCtaDescription("Contact us for more information.");
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load editor");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [managed, route]);

  const section = managed?.section ?? "services";
  const icon =
    section === "careers"
      ? route.includes("/attachments")
        ? Briefcase
        : route.includes("/internships")
          ? GraduationCap
          : route.includes("/jobs")
            ? Users
            : Briefcase
      : Globe;

  const previewFeatures = useMemo(() => normalizeLines(featuresText), [featuresText]);
  const previewBenefits = useMemo(() => normalizeLines(benefitsText), [benefitsText]);

  const onSave = async () => {
    if (!managed) return;
    setSaving(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch("/api/pages/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          route,
          section,
          title,
          hero_label: heroLabel,
          description,
          features_title: featuresTitle,
          features: previewFeatures,
          benefits_title: benefitsTitle,
          benefits: previewBenefits,
          cta_title: ctaTitle,
          cta_description: ctaDescription,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      setExisting(true);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!confirm("Delete this managed page content?")) return;

    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch("/api/pages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ route }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");

      setExisting(false);
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push("/dashboard/pages")}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Pages
          </button>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{existing ? "Edit page" : "Create page"}</h2>
          <p className="text-gray-600 mt-1">
            Route: <span className="font-mono text-gray-700">{route}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving || !existing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero label</label>
                <input
                  value={heroLabel}
                  onChange={(e) => setHeroLabel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features title</label>
                <input
                  value={featuresTitle}
                  onChange={(e) => setFeaturesTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
                <textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits title</label>
                <input
                  value={benefitsTitle}
                  onChange={(e) => setBenefitsTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (one per line)</label>
                <textarea
                  value={benefitsText}
                  onChange={(e) => setBenefitsText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA title</label>
                <input
                  value={ctaTitle}
                  onChange={(e) => setCtaTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA description</label>
                <textarea
                  value={ctaDescription}
                  onChange={(e) => setCtaDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5">
            <div className="text-sm font-bold text-gray-700 mb-3">Preview</div>
            <div className="overflow-auto max-h-[70vh] pr-2">
              {section === "services" ? (
                <ServiceDetailTemplate
                  activeHref={route}
                  title={title || "Untitled"}
                  heroLabel={heroLabel || "LABEL"}
                  description={description || "Add a description to see it here."}
                  featuresTitle={featuresTitle || "FEATURES"}
                  features={previewFeatures.length ? previewFeatures : ["Add features"]}
                  benefitsTitle={benefitsTitle || "BENEFITS"}
                  benefits={previewBenefits.length ? previewBenefits : ["Add benefits"]}
                  ctaTitle={ctaTitle || "Get Started"}
                  ctaDescription={ctaDescription || "CTA description goes here."}
                  icon={icon}
                />
              ) : (
                <CareerDetailTemplate
                  activeHref={route}
                  title={title || "Untitled"}
                  heroLabel={heroLabel || "LABEL"}
                  description={description || "Add a description to see it here."}
                  featuresTitle={featuresTitle || "FEATURES"}
                  features={previewFeatures.length ? previewFeatures : ["Add features"]}
                  benefitsTitle={benefitsTitle || "BENEFITS"}
                  benefits={previewBenefits.length ? previewBenefits : ["Add benefits"]}
                  ctaTitle={ctaTitle || "Get Started"}
                  ctaDescription={ctaDescription || "CTA description goes here."}
                  icon={icon}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

