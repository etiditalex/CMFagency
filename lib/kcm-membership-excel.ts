export const KCM_MEMBERSHIP_XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Dynamic import keeps `xlsx` (~large) off the critical path until an export runs. */
async function loadXlsx() {
  return import("xlsx");
}

function cellValue(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && !Number.isFinite(v)) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

function prefixKeys(obj: Record<string, unknown>, prefix: string): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[prefix + k] = cellValue(v);
  }
  return out;
}

function rowsToSheetRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const flat: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(row)) flat[k] = cellValue(v);
    return flat;
  });
}

export async function buildSingleMemberXlsxBuffer(payload: {
  exported_at: string;
  membership: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  portfolio_items: Record<string, unknown>[];
  wallet_transactions: Record<string, unknown>[];
}): Promise<Buffer> {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  const overviewRow = {
    ...prefixKeys(payload.membership, "membership_"),
    ...(payload.profile ? prefixKeys(payload.profile, "profile_") : {}),
    exported_at: payload.exported_at,
  };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([overviewRow]), "Overview");

  if (payload.portfolio_items.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsToSheetRows(payload.portfolio_items)), "Portfolio");
  }

  if (payload.wallet_transactions.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsToSheetRows(payload.wallet_transactions)), "Wallet");
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }));
}

/** Row shape matches enriched membership from fusion-xpress GET /kcm-memberships */
export function flattenMembershipForExcel(row: Record<string, unknown>): Record<string, string | number | boolean> {
  const p = (row.profile as Record<string, unknown> | null | undefined) ?? null;
  const c = (row.contributions as Record<string, unknown> | null | undefined) ?? null;
  return {
    id: cellValue(row.id),
    first_name: cellValue(row.first_name),
    second_name: cellValue(row.second_name),
    contact: cellValue(row.contact),
    email: cellValue(row.email),
    experience: cellValue(row.experience),
    top_model_interest: cellValue(row.top_model_interest),
    payment_amount_kes: cellValue(row.payment_amount_kes),
    payment_confirmed: cellValue(row.payment_confirmed),
    payment_status: cellValue(row.payment_status),
    mpesa_receipt: cellValue(row.mpesa_receipt),
    paid_at: cellValue(row.paid_at),
    status: cellValue(row.status),
    review_notes: cellValue(row.review_notes),
    account_status: cellValue(row.account_status),
    created_at: cellValue(row.created_at),
    updated_at: cellValue(row.updated_at),
    profile_display_name: p ? cellValue(p.display_name) : "",
    profile_category: p ? cellValue(p.profile_category) : "",
    professional_title: p ? cellValue(p.professional_title) : "",
    bio: p ? cellValue(p.bio) : "",
    portfolio_text: p ? cellValue(p.portfolio_text) : "",
    social_instagram: p ? cellValue(p.social_instagram) : "",
    social_facebook: p ? cellValue(p.social_facebook) : "",
    social_tiktok: p ? cellValue(p.social_tiktok) : "",
    social_x: p ? cellValue(p.social_x) : "",
    avatar_url: p ? cellValue(p.avatar_url) : "",
    cover_url: p ? cellValue(p.cover_url) : "",
    profile_updated_at: p ? cellValue(p.updated_at) : "",
    portfolio_files_count: p ? cellValue(p.portfolio_item_count) : "",
    wallet_total_kes: c ? cellValue(c.total_contributions_kes) : "",
    wallet_pending_kes: c ? cellValue(c.pending_contributions_kes) : "",
    wallet_success_count: c ? cellValue(c.successful_contributions_count) : "",
    wallet_last_at: c ? cellValue(c.last_contribution_at) : "",
  };
}

export async function buildAllMembersXlsxBuffer(enriched: Record<string, unknown>[]): Promise<Buffer> {
  const XLSX = await loadXlsx();
  const rows = enriched.map((r) => flattenMembershipForExcel(r));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: "No members in this export" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }));
}
