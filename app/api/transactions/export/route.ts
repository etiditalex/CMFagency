import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function isAdminOrManager(userId: string, serviceKey: string, supabaseUrl: string): Promise<boolean> {
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: pm } = await admin.from("portal_members").select("role").eq("user_id", userId).maybeSingle();
  if (pm?.role === "admin" || pm?.role === "manager") return true;
  const { data: au } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  return !!au;
}

/**
 * Exports all transactions (for user's campaigns) as CSV for reconciliation.
 * Uses authenticated Supabase client - RLS limits to user's campaigns.
 * Failed / abandoned rows are omitted for campaign owners (not admin/manager).
 * Max 10,000 rows to avoid timeouts.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let showIncomplete = false;
  if (serviceKey) {
    showIncomplete = await isAdminOrManager(userData.user.id, serviceKey, supabaseUrl);
  }

  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select("id,reference,created_at,status,amount,currency,quantity,provider,email,payer_name,paid_at,verified_at,fulfilled_at,campaign_type,metadata,campaign_id")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (txErr) {
    return NextResponse.json({ error: txErr.message }, { status: 500 });
  }

  let rows = (txRows ?? []) as Array<{
    id: string;
    reference: string;
    created_at: string;
    status: string;
    amount: number;
    currency: string;
    quantity: number;
    provider: string;
    email?: string | null;
    payer_name?: string | null;
    paid_at?: string | null;
    verified_at?: string | null;
    fulfilled_at?: string | null;
    campaign_type: string;
    metadata?: Record<string, unknown>;
    campaign_id: string;
  }>;

  if (!showIncomplete) {
    rows = rows.filter((r) => r.status !== "failed" && r.status !== "abandoned");
  }

  // Fetch campaign titles for lookup (RLS filters to user's campaigns)
  const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
  const campaignTitleById: Record<string, string> = {};
  if (campaignIds.length > 0) {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id,title,slug")
      .in("id", campaignIds);
    for (const c of (campaigns ?? []) as Array<{ id: string; title?: string; slug?: string }>) {
      campaignTitleById[c.id] = String(c.title || c.slug || c.id);
    }
  }

  const escapeCsv = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = [
    "Date",
    "Reference",
    "Campaign",
    "Type",
    "Payer Name",
    "Email",
    "Amount",
    "Currency",
    "Quantity",
    "Status",
    "Provider",
    "Paid At",
    "M-Pesa Receipt",
    "Transaction ID",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((t) => {
      const meta = (typeof t.metadata === "object" && t.metadata ? t.metadata : {}) as Record<string, unknown>;
      const mpesaReceipt = (meta.mpesa_receipt as string) ?? "";
      const campaignTitle = campaignTitleById[t.campaign_id] ?? t.campaign_id;

      return [
        escapeCsv(new Date(t.created_at).toISOString()),
        escapeCsv(t.reference),
        escapeCsv(campaignTitle),
        escapeCsv(t.campaign_type === "vote" ? "Vote" : "Ticket"),
        escapeCsv(t.payer_name?.trim() ?? ""),
        escapeCsv(t.email?.trim() ?? ""),
        escapeCsv(t.amount),
        escapeCsv(String(t.currency ?? "").toUpperCase()),
        escapeCsv(t.quantity),
        escapeCsv(t.status),
        escapeCsv(t.provider ?? ""),
        escapeCsv(t.paid_at ? new Date(t.paid_at).toISOString() : ""),
        escapeCsv(mpesaReceipt),
        escapeCsv(t.id),
      ].join(",");
    }),
  ];

  const csv = lines.join("\n");
  const bom = "\uFEFF";

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `transactions-reconciliation-${timestamp}.csv`;

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
