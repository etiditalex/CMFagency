/**
 * Reads Desktop Contenstants.xlsx (sheet "Nominees": Name, Category),
 * matches each row to a vote campaign by title, inserts missing contestants.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/sync-nominees-from-excel.mjs [path-to-xlsx]
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { execFileSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env.local") });

const DEFAULT_XLSX = "C:\\Users\\etidi\\OneDrive\\Desktop\\Contenstants.xlsx";

/** Normalize for title matching (Excel vs DB apostrophes, spacing). */
function normTitle(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");
}

/** When Excel label differs from campaigns.title in the DB. normTitle keys. */
const TITLE_ALIASES = new Map([
  ["best mc of the year", "best-master-of-ceremonies-mc-of-the-year"],
]);

function readRowsFromExcel(xlsxPath) {
  const py = `
import json, openpyxl
wb = openpyxl.load_workbook(${JSON.stringify(xlsxPath)}, read_only=True, data_only=True)
ws = wb["Nominees"]
out = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue
    name, cat = row[0], row[1]
    if name is None and cat is None:
        continue
    out.append({"name": (name or "").strip(), "category": (cat or "").strip()})
wb.close()
print(json.dumps(out))
`;
  const raw = execFileSync("py", ["-c", py], { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(raw.trim());
}

async function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id,slug,title")
    .eq("type", "vote");

  if (campErr) {
    console.error(campErr);
    process.exit(1);
  }

  const byNormTitle = new Map();
  const bySlug = new Map();
  for (const c of campaigns ?? []) {
    byNormTitle.set(normTitle(c.title), c);
    bySlug.set(c.slug, c);
  }

  function resolveCampaign(categoryTitle) {
    const n = normTitle(categoryTitle);
    let c = byNormTitle.get(n);
    if (c) return c;
    const slugHint = TITLE_ALIASES.get(n);
    if (slugHint) return bySlug.get(slugHint) ?? null;
    return null;
  }

  const rows = readRowsFromExcel(xlsxPath);
  let inserted = 0;
  let skippedDup = 0;
  let skippedBad = 0;
  const unknownCats = new Set();

  for (const row of rows) {
    if (!row.name) {
      skippedBad++;
      continue;
    }
    const camp = resolveCampaign(row.category);
    if (!camp) {
      unknownCats.add(row.category);
      skippedBad++;
      continue;
    }

    const { data: existing, error: exErr } = await supabase
      .from("contestants")
      .select("id,name,sort_order")
      .eq("campaign_id", camp.id);

    if (exErr) {
      console.error("list contestants", exErr);
      process.exit(1);
    }

    const nameTrim = row.name.trim();
    const exists = (existing ?? []).some((e) => e.name.trim().toLowerCase() === nameTrim.toLowerCase());
    if (exists) {
      skippedDup++;
      continue;
    }

    const orders = (existing ?? []).map((e) => Number(e.sort_order) || 0);
    const maxSort = orders.length ? Math.max(...orders) : -1;
    const { error: insErr } = await supabase.from("contestants").insert({
      campaign_id: camp.id,
      name: nameTrim,
      image_url: null,
      sort_order: maxSort + 1,
    });

    if (insErr) {
      console.error("insert failed", nameTrim, camp.slug, insErr.message);
      skippedBad++;
      continue;
    }
    inserted++;
    console.log("Inserted:", nameTrim, "→", camp.slug);
  }

  console.log("\nDone. inserted=%s skipped_already_present=%s skipped_bad_or_unknown=%s", inserted, skippedDup, skippedBad);
  if (unknownCats.size) {
    console.log("\nUnknown categories (add campaign or alias in script):");
    for (const u of unknownCats) console.log(" -", u);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
