import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getSeoPackageById } from "@/lib/service-packages-catalog";
import { sendServiceInvoiceCreatedEmail } from "@/lib/send-service-invoice-email";

export const dynamic = "force-dynamic";

type Body = {
  package_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
  customer_address?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const packageId = (body.package_id ?? "").trim();
    const customerName = (body.customer_name ?? "").trim();
    const customerEmail = (body.customer_email ?? "").trim().toLowerCase();
    const customerPhone = (body.customer_phone ?? "").trim() || null;
    const customerCompany = (body.customer_company ?? "").trim() || null;
    const customerAddress = (body.customer_address ?? "").trim() || null;

    if (!packageId) return NextResponse.json({ error: "package_id is required" }, { status: 400 });
    if (!customerName) return NextResponse.json({ error: "customer_name is required" }, { status: 400 });
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "Valid customer_email is required" }, { status: 400 });
    }

    const pkg = getSeoPackageById(packageId);
    if (!pkg) return NextResponse.json({ error: "Unknown package_id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const accessToken = crypto.randomBytes(24).toString("hex");
    const due = new Date();
    due.setDate(due.getDate() + 14);

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("service_invoices")
      .insert({
        access_token: accessToken,
        package_slug: pkg.packageId,
        package_title: pkg.title,
        amount_kes: pkg.amountKes,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_company: customerCompany,
        customer_address: customerAddress,
        status: "unpaid",
        due_date: due.toISOString().slice(0, 10),
      } as Record<string, unknown>)
      .select("id,invoice_number,access_token,amount_kes,package_title")
      .single();

    if (insErr || !inserted) {
      const msg = insErr?.message ?? "insert_failed";
      if (/relation.*service_invoices|does not exist/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Invoices table not found. Run database/service_invoices_patch_01.sql in Supabase.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const row = inserted as {
      id: string;
      invoice_number: number;
      access_token: string;
      amount_kes: number;
      package_title: string;
    };

    const invoiceLabel = `CF-${new Date().getFullYear()}-${String(row.invoice_number).padStart(6, "0")}`;

    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "").replace(/\/$/, "");
    const viewUrl = siteBase ? `${siteBase}/invoice/${row.access_token}` : `/invoice/${row.access_token}`;

    void sendServiceInvoiceCreatedEmail({
      to: customerEmail,
      customerName,
      invoiceLabel,
      packageTitle: row.package_title,
      amountKes: row.amount_kes,
      accessToken: row.access_token,
    }).catch((e) => console.warn("[service-invoices/create] email:", e instanceof Error ? e.message : e));

    return NextResponse.json({
      ok: true,
      invoice_id: row.id,
      invoice_label: invoiceLabel,
      access_token: row.access_token,
      view_url: viewUrl,
      amount_kes: row.amount_kes,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
