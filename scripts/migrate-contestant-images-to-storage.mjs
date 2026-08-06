/**
 * Moves base64 data-URI contestant photos out of `contestants.image_url` into Supabase Storage.
 *
 * Storing images as data URIs made the column ~133 MB, which timed out `/voting/all` and pushed
 * up to 27 MB into a single category page. It also defeated the Next.js image optimizer, so a
 * 5 MB photo was downloaded to paint a 56px thumbnail.
 *
 * For each row this uploads two objects and repoints the column at the display copy:
 *   contestants/original/<id>.<ext>  untouched bytes, so the migration is reversible
 *   contestants/<id>.<ext>           downscaled copy that `next/image` can resize further
 *
 * Safe to re-run: rows already holding an http(s) URL are skipped.
 *
 * Usage:
 *   node scripts/migrate-contestant-images-to-storage.mjs --dry-run
 *   node scripts/migrate-contestant-images-to-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "campaign-images";
/** Large enough for any future full-bleed use; the optimizer serves 40–56px from it today. */
const MAX_EDGE = 1200;
const DRY_RUN = process.argv.includes("--dry-run");
/** The column is huge, so rows are read a few at a time to stay under the statement timeout. */
const READ_BATCH = 4;

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function parseDataUri(value) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(value);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) return null;
  return { mime, ext, buffer: Buffer.from(m[2], "base64") };
}

async function buildDisplayCopy({ mime, ext, buffer }) {
  // Animated GIFs lose their frames through a plain resize, so they ship as-is.
  if (ext === "gif") return { buffer, mime, ext };
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    // Keep the original when re-encoding would not actually save anything.
    if (out.length >= buffer.length) return { buffer, mime, ext };
    return { buffer: out, mime: "image/jpeg", ext: "jpg" };
  } catch (e) {
    console.warn(`    resize failed (${e.message}); uploading original bytes`);
    return { buffer, mime, ext };
  }
}

async function upload(path, buffer, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

const { data: idRows, error: idErr } = await supabase.from("contestants").select("id").order("id");
if (idErr) {
  console.error("Failed to list contestants:", idErr.message);
  process.exit(1);
}
const ids = idRows.map((r) => r.id);
console.log(`${DRY_RUN ? "[DRY RUN] " : ""}contestants to inspect: ${ids.length}`);

let migrated = 0;
let skipped = 0;
let failed = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (let i = 0; i < ids.length; i += READ_BATCH) {
  const slice = ids.slice(i, i + READ_BATCH);
  const { data: rows, error } = await supabase
    .from("contestants")
    .select("id, name, image_url")
    .in("id", slice);

  if (error) {
    console.error(`  batch ${i}: read failed: ${error.message}`);
    failed += slice.length;
    continue;
  }

  for (const row of rows) {
    const value = row.image_url ?? "";
    if (!value || !value.startsWith("data:")) {
      skipped++;
      continue;
    }

    const parsed = parseDataUri(value);
    if (!parsed) {
      console.warn(`  ! ${row.name}: unrecognised data URI, left unchanged`);
      skipped++;
      continue;
    }

    bytesBefore += value.length;
    const label = `${row.name} (${(parsed.buffer.length / 1024 / 1024).toFixed(2)} MB)`;

    try {
      const display = await buildDisplayCopy(parsed);
      const originalPath = `contestants/original/${row.id}.${parsed.ext}`;
      const displayPath = `contestants/${row.id}.${display.ext}`;

      if (DRY_RUN) {
        console.log(
          `  would migrate ${label} -> ${displayPath} (${(display.buffer.length / 1024).toFixed(0)} KB)`
        );
        bytesAfter += display.buffer.length;
        migrated++;
        continue;
      }

      await upload(originalPath, parsed.buffer, parsed.mime);
      await upload(displayPath, display.buffer, display.mime);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(displayPath).data.publicUrl;
      const { error: updErr } = await supabase
        .from("contestants")
        .update({ image_url: publicUrl })
        .eq("id", row.id);
      if (updErr) throw new Error(`update row: ${updErr.message}`);

      bytesAfter += display.buffer.length;
      migrated++;
      console.log(`  ✓ ${label} -> ${(display.buffer.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

console.log(
  `\n${DRY_RUN ? "[DRY RUN] " : ""}migrated=${migrated} skipped=${skipped} failed=${failed}\n` +
    `column bytes before: ${(bytesBefore / 1024 / 1024).toFixed(1)} MB\n` +
    `stored image bytes:  ${(bytesAfter / 1024 / 1024).toFixed(1)} MB (now served from Storage, not the DB)`
);
