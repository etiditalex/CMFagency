import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Export check-in records (transactions with checked_in_at set) as CSV for gate/attendance records.
 * Same auth as Gate: portal member with reports. RLS limits to user's campaigns.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: pm } = await supabaseAdmin.from("portal_members").select("role, features").eq("user_id", user.id).maybeSingle();
  const { data: au } = await supabaseAdmin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const isPortal = !!pm || !!au;
  const hasReports =
    !!au ||
    (!!pm && ((pm.role === "admin" || pm.role === "manager") || (Array.isArray((pm as { features?: string[] }).features) && (pm as { features?: string[] }).features?.includes("reports"))));
  if (!isPortal || !hasReports) {
    return NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 });
  }

  // RLS limits transactions to user's campaigns
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("reference,checked_in_at,payer_name,email,amount,currency,quantity,campaign_type,campaign_id,status")
    .not("checked_in_at", "is", null)
    .eq("status", "success")
    .order("checked_in_at", { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const txRows = (rows ?? []) as Array<{
    reference: string;
    checked_in_at: string | null;
    payer_name?: string | null;
    email?: string | null;
    amount: number;
    currency?: string | null;
    quantity?: number | null;
    campaign_type?: string | null;
    campaign_id: string;
    status?: string | null;
  }>;

  const campaignIdsSeen = [...new Set(txRows.map((r) => r.campaign_id))];
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,title,slug")
    .in("id", campaignIdsSeen);
  const campaignTitleById: Record<string, string> = {};
  for (const c of (campaigns ?? []) as Array<{ id: string; title?: string; slug?: string }>) {
    campaignTitleById[c.id] = String(c.title || c.slug || c.id);
  }

  const escapeCsv = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = ["Check-in time", "Reference", "Campaign", "Type", "Payer name", "Email", "Amount", "Currency", "Quantity"];
  const lines = [
    headers.join(","),
    ...txRows.map((t) => {
      const typeLabel = t.campaign_type === "vote" ? "Vote" : "Ticket";
      const campaignTitle = campaignTitleById[t.campaign_id] ?? t.campaign_id;
      return [
        escapeCsv(t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" }) : ""),
        escapeCsv(t.reference),
        escapeCsv(campaignTitle),
        escapeCsv(typeLabel),
        escapeCsv((t.payer_name ?? "").trim()),
        escapeCsv((t.email ?? "").trim()),
        escapeCsv(t.amount),
        escapeCsv(String(t.currency ?? "").toUpperCase()),
        escapeCsv(t.quantity ?? ""),
      ].join(",");
    }),
  ];

  const csv = lines.join("\n");
  const filename = `gate-check-ins-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
