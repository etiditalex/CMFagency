"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  defaultFormFields,
  fieldTypeLabel,
  FORM_CATEGORIES,
  FORM_FIELD_TYPES,
  formsTableMissingMessage,
  isStarterFormSlug,
  newFieldId,
  parseFormFields,
  slugifyFormTitle,
  starterFormBySlug,
  type FormFieldType,
  type FusionFormField,
} from "@/lib/fusion-forms";
import { supabase } from "@/lib/supabase";

type Props = { formId?: string };

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-primary-500";

export default function FusionFormEditor({ formId }: Props) {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [ready, setReady] = useState(!formId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [intro, setIntro] = useState("");
  const [category, setCategory] = useState<string>(FORM_CATEGORIES[0]);
  const [fields, setFields] = useState<FusionFormField[]>(defaultFormFields);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [linkHref, setLinkHref] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, router, user]);

  useEffect(() => {
    if (!formId || authLoading || portalLoading || !isAdmin) return;
    let cancelled = false;
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("fusion_forms")
        .select("title, slug, excerpt, intro, category, image_url, fields, link_href, published_at")
        .eq("id", formId)
        .maybeSingle();
      if (cancelled) return;
      if (loadError?.message.includes("link_href")) {
        const fallback = await supabase
          .from("fusion_forms")
          .select("title, slug, excerpt, intro, category, image_url, fields, published_at")
          .eq("id", formId)
          .maybeSingle();
        if (cancelled) return;
        if (fallback.error || !fallback.data) {
          setError(formsTableMissingMessage(fallback.error?.message ?? "") ?? fallback.error?.message ?? "Form not found.");
          setReady(true);
          return;
        }
        const row = fallback.data as {
          title: string;
          slug: string;
          excerpt: string | null;
          intro: string | null;
          category: string | null;
          image_url: string | null;
          fields: unknown;
          published_at: string | null;
        };
        const parsed = parseFormFields(row.fields);
        const starter = starterFormBySlug(row.slug);
        setTitle(row.title);
        setSlug(row.slug);
        setSlugTouched(true);
        setExcerpt(row.excerpt ?? "");
        setIntro(row.intro ?? "");
        setCategory(row.category || FORM_CATEGORIES[0]);
        setLinkHref(starter?.linkHref ?? "");
        setFields(parsed.length ? parsed : starter ? [] : defaultFormFields());
        setImageUrl(row.image_url);
        setImagePreviewUrl(row.image_url);
        setPublishedAt(row.published_at);
        setPublishNow(row.published_at != null);
        setReady(true);
        return;
      }
      if (loadError || !data) {
        setError(formsTableMissingMessage(loadError?.message ?? "") ?? loadError?.message ?? "Form not found.");
        setReady(true);
        return;
      }
      const row = data as {
        title: string;
        slug: string;
        excerpt: string | null;
        intro: string | null;
        category: string | null;
        image_url: string | null;
        fields: unknown;
        link_href?: string | null;
        published_at: string | null;
      };
      const parsed = parseFormFields(row.fields);
      const starter = starterFormBySlug(row.slug);
      const savedLink = row.link_href?.trim() || starter?.linkHref || "";
      setTitle(row.title);
      setSlug(row.slug);
      setSlugTouched(true);
      setExcerpt(row.excerpt ?? "");
      setIntro(row.intro ?? "");
      setCategory(row.category || FORM_CATEGORIES[0]);
      setLinkHref(savedLink);
      setFields(parsed.length ? parsed : savedLink ? [] : defaultFormFields());
      setImageUrl(row.image_url);
      setImagePreviewUrl(row.image_url);
      setPublishedAt(row.published_at);
      setPublishNow(row.published_at != null);
      setReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, formId, isAdmin, portalLoading]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugifyFormTitle(title));
  }, [slugTouched, title]);

  const updateField = (id: string, patch: Partial<FusionFormField>) => {
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Session expired. Please sign in again.");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/campaign-image/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Image upload failed");
    }
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedSlug = slugifyFormTitle(slug);
      if (!title.trim()) throw new Error("Title is required.");
      if (!normalizedSlug) throw new Error("Slug is required.");
      const cleanFields = parseFormFields(fields);
      const opensExistingPage = linkHref.trim().startsWith("/");
      if (cleanFields.length === 0 && !opensExistingPage) throw new Error("Add at least one field.");
      for (const field of cleanFields) {
        if (field.type === "select" && field.options.length === 0) {
          throw new Error(`Add at least one option for “${field.label}”.`);
        }
      }
      let nextImage = imageUrl;
      if (imageFile) nextImage = await uploadImageFile(imageFile);
      const nextPublishedAt = publishNow ? publishedAt ?? new Date().toISOString() : null;
      const payload = {
        slug: normalizedSlug,
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        intro: intro.trim() || null,
        category: category.trim() || null,
        image_url: nextImage,
        fields: cleanFields,
        link_href: linkHref.trim() || null,
        published_at: nextPublishedAt,
      };
      const save = (body: typeof payload | Omit<typeof payload, "link_href">) =>
        formId
          ? supabase.from("fusion_forms").update(body).eq("id", formId)
          : supabase.from("fusion_forms").insert({ ...body, created_by: user.id });
      let { error: saveError } = await save(payload);
      if (saveError?.message.includes("link_href")) {
        const { link_href: _ignored, ...withoutLink } = payload;
        const retried = await save(withoutLink);
        saveError = retried.error;
      }
      if (saveError) throw saveError;
      router.push("/dashboard/forms");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save the form.";
      setError(formsTableMissingMessage(message) ?? message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading || !ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="border-b border-hairline pb-3 text-left text-xl font-bold text-[#1a2332] md:text-2xl">
            {formId ? "Edit form" : "New form"}
          </h2>
          <p className="mt-1 text-left text-gray-600">
            Published forms appear as cards on the public Forms page. Registration and Volunteers open their existing
            application pages. Leave publish unchecked to keep a draft.
          </p>
        </div>
        <Link
          href="/dashboard/forms"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50"
        >
          Back to forms
        </Link>
      </div>

      {error ? <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-6 border border-hairline bg-white p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Slug *</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${inputClass} font-mono`}
            required
          />
          <p className="mt-2 text-xs text-gray-500">URL: /forms/{slugifyFormTitle(slug) || "slug"}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Card opens</label>
          <input
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            className={inputClass}
            placeholder="/events/registration — leave empty to open the questions on this form"
          />
          {linkHref.trim().startsWith("/") ? (
            <p className="mt-2 text-xs text-gray-500">
              Visitors who open this card go to {linkHref.trim()}. Title, summary, category, and cover image are what
              change on the Forms page.
              {isStarterFormSlug(slugifyFormTitle(slug))
                ? " Questions below are not shown on the existing application page."
                : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Leave this empty to show the questions on /forms/{slugifyFormTitle(slug) || "slug"}.</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Card summary</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Short text shown on the Forms grid"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Introduction</label>
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Shown above the questions on the form page"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {FORM_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700">Questions</label>
            <button
              type="button"
              onClick={() =>
                setFields((current) => [
                  ...current,
                  { id: newFieldId(), label: "", type: "text", required: false, placeholder: "", options: [] },
                ])
              }
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 bg-[#f8fafc] p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_180px_auto]">
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="Question label"
                    required
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {FORM_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {fieldTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => moveField(index, -1)} className="rounded p-2 text-gray-600 hover:bg-white" aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => moveField(index, 1)} className="rounded p-2 text-gray-600 hover:bg-white" aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}
                      className="rounded p-2 text-red-600 hover:bg-white"
                      aria-label="Remove question"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={field.placeholder}
                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="Placeholder (optional)"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Required
                  </label>
                </div>
                {field.type === "select" ? (
                  <textarea
                    value={field.options.join("\n")}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value.split("\n").map((line) => line.trim()),
                      })
                    }
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="One dropdown option per line"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Cover image (optional)</label>
          {imagePreviewUrl ? (
            <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="" className="h-40 w-full object-cover" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreviewUrl(null);
                  setImageUrl(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-500">
                <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload a cover image</p>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, GIF, WebP (max 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setImagePreviewUrl(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          Publish now (visible on the public Forms page)
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/forms" className="rounded-md border border-gray-200 bg-white px-4 py-2 font-semibold hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving…" : publishNow ? "Publish" : "Save draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
