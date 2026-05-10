import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ServiceInvoicePayClient from "@/components/service-invoices/ServiceInvoicePayClient";

export const dynamic = "force-dynamic";

function fmtInvNum(invoiceNumber: number): string {
  return `CF-${new Date().getFullYear()}-${String(invoiceNumber).padStart(6, "0")}`;
}

export default async function ServiceInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) notFound();

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: inv, error } = await supabase
    .from("service_invoices")
    .select(
      "id,invoice_number,access_token,package_title,amount_kes,customer_name,customer_email,customer_phone,customer_company,customer_address,status,due_date,paid_at,created_at"
    )
    .eq("access_token", token.trim())
    .maybeSingle();

  if (error || !inv) notFound();

  const row = inv as {
    invoice_number: number;
    package_title: string;
    amount_kes: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_company: string | null;
    customer_address: string | null;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
  };

  const paid = row.status === "paid";
  const label = fmtInvNum(row.invoice_number);

  return (
    <div className="min-h-screen bg-gray-100 px-4 pb-10 pt-24 md:pb-14 md:pt-28">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div
            className={`absolute right-4 top-4 z-10 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-md ${
              paid ? "bg-secondary-600" : "bg-red-600"
            }`}
          >
            {paid ? "Paid" : "Unpaid"}
          </div>

          <div className="relative p-6 pt-14 md:p-10 md:pt-16">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between md:gap-12">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 text-sm font-extrabold text-white">
                    CF
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-gray-900">Changer Fusions</div>
                    <div className="text-xs font-medium text-gray-500">Digital marketing · Kenya</div>
                  </div>
                </div>
              </div>
              <div className="text-sm leading-relaxed text-gray-700 md:text-right">
                <div className="font-semibold text-gray-900">Changer Fusions</div>
                <div>M-Pesa Paybill: use reference <span className="font-mono">{label}</span></div>
                <div className="mt-2 text-xs text-gray-500">
                  Ambalal Building, Nkruma Road
                  <br />
                  Ambalal, Mombasa, Kenya
                </div>
              </div>
            </div>

            <div className="mt-10 bg-gray-100 px-5 py-6 md:px-8">
              <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">Proforma Invoice {label}</h1>
              <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-gray-900">Invoice date: </span>
                  {new Date(row.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Due date: </span>
                  {row.due_date
                    ? new Date(row.due_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-8">
              <div className="text-xs font-extrabold uppercase tracking-wider text-secondary-600">Invoiced to</div>
              <div className="mt-3 text-sm leading-relaxed text-gray-800">
                {row.customer_company ? (
                  <>
                    <div className="font-bold text-gray-900">{row.customer_company}</div>
                    <div className="mt-1">ATTN: {row.customer_name}</div>
                  </>
                ) : (
                  <div className="font-bold text-gray-900">{row.customer_name}</div>
                )}
                {row.customer_address ? (
                  <div className="mt-2 whitespace-pre-line text-gray-600">{row.customer_address}</div>
                ) : null}
                <div className="mt-2 text-gray-600">{row.customer_email}</div>
                {row.customer_phone ? <div className="text-gray-600">{row.customer_phone}</div> : null}
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-bold text-gray-900 md:px-5">Item</th>
                    <th className="hidden px-4 py-3 font-bold text-gray-900 sm:table-cell md:px-5">Description</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900 md:px-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-4 align-top font-medium text-gray-900 md:px-5">SEO-001</td>
                    <td className="hidden px-4 py-4 align-top text-gray-700 sm:table-cell md:px-5">
                      <div className="font-semibold">{row.package_title}</div>
                      <div className="mt-1 text-xs text-gray-500">Monthly subscription · Changer Fusions SEO services</div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-gray-900 md:px-5">
                      KSh {row.amount_kes.toLocaleString("en-KE")}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-4 md:px-5">
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount due</div>
                  <div className="text-xl font-extrabold tabular-nums text-gray-900">
                    KSh {row.amount_kes.toLocaleString("en-KE")}
                  </div>
                </div>
              </div>
            </div>

            {paid ? (
              <div className="mt-8 rounded-xl border border-secondary-200 bg-secondary-50 px-5 py-4 text-secondary-900">
                <strong>Paid</strong>
                {row.paid_at ? (
                  <span className="ml-2 text-sm">
                    on{" "}
                    {new Date(row.paid_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
                . Thank you — our team will follow up regarding your SEO subscription.
              </div>
            ) : (
              <ServiceInvoicePayClient accessToken={token.trim()} customerEmail={row.customer_email} unpaid />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
