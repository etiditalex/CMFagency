import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Campaign and contestant artwork lives in Supabase Storage, never in the database.
 *
 * These images used to be written into `image_url` as base64 data URIs. That grew the
 * contestants column to ~133 MB, timed out `/voting/all`, pushed up to 27 MB into a single
 * category page, and made the photos invisible to the Next.js image optimizer.
 */
export const CAMPAIGN_IMAGE_BUCKET = "campaign-images";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export type ImageUploadResult = { ok: true; url: string } | { ok: false; status: number; error: string };

/**
 * Validates and stores `file`, returning its public URL.
 * `folder` groups objects in the bucket (e.g. "contestants").
 */
export async function uploadCampaignImage(
  supabase: SupabaseClient,
  file: File,
  folder: string
): Promise<ImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, status: 400, error: `Invalid file type. Use: ${ALLOWED_IMAGE_TYPES.join(", ")}` };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, status: 400, error: "File too large. Max 5MB." };
  }

  const extension = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(CAMPAIGN_IMAGE_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return { ok: false, status: 500, error: `Upload failed: ${error.message}` };
  }

  return { ok: true, url: supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}
