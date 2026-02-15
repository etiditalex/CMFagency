"use client";

import { QRCodeSVG } from "qrcode.react";

type PaymentReceiptProps = {
  /** Transaction reference (used for QR and ticket number) */
  reference: string;
  /** Campaign/event title */
  campaignTitle: string;
  /** Campaign slug for ticket number prefix */
  campaignSlug?: string | null;
  /** Ticket, vote, or order (merchandise) */
  type: "ticket" | "vote" | "order";
  /** Holder name (payer_name or email) */
  holder: string;
  /** Amount paid */
  amount: number;
  /** Currency code */
  currency: string;
  /** Quantity of tickets or votes */
  quantity: number;
  /** Event start date (optional) */
  startsAt?: string | null;
  /** Event end date (optional) */
  endsAt?: string | null;
  /** For merchandise: custom label instead of campaign title */
  orderLabel?: string;
};

function formatTicketNumber(
  reference: string,
  type: "ticket" | "vote" | "order",
  campaignSlug?: string | null
): string {
  const suffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const prefix = campaignSlug
    ? campaignSlug
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8)
    : "CMF";
  const typeCode = type === "vote" ? "VOT" : type === "order" ? "ORD" : "TKT";
  return `${prefix}-${typeCode}-${suffix}`;
}

function formatDates(startsAt?: string | null, endsAt?: string | null): string | null {
  if (!startsAt && !endsAt) return null;
  if (startsAt && endsAt) {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} - ${e.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
  }
  if (startsAt) {
    return new Date(startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  return new Date(endsAt!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function PaymentReceipt({
  reference,
  campaignTitle,
  campaignSlug,
  type,
  holder,
  amount,
  currency,
  quantity,
  startsAt,
  endsAt,
  orderLabel,
}: PaymentReceiptProps) {
  const ticketNumber = formatTicketNumber(reference, type, campaignSlug);
  const dates = formatDates(startsAt, endsAt);
  const typeLabel = type === "vote" ? "Vote" : type === "order" ? "Order" : "Ticket";
  const qtyLabel = quantity > 1
    ? (type === "vote" ? "Votes" : type === "order" ? "Items" : "Tickets")
    : typeLabel;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: ticket info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            {orderLabel ?? campaignTitle}
          </h2>

          {dates && (
            <p className="mt-2 text-gray-600 text-sm">
              {dates}
              {startsAt && (
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(orderLabel ?? campaignTitle)}&dates=${new Date(startsAt).toISOString().replace(/[-:]/g, "").slice(0, 15)}/${endsAt ? new Date(endsAt).toISOString().replace(/[-:]/g, "").slice(0, 15) : new Date(startsAt).toISOString().replace(/[-:]/g, "").slice(0, 15)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  Add to calendar
                </a>
              )}
            </p>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-sm">
              <div>
                <span className="text-gray-500 font-medium">
                  {type === "vote" ? "Vote" : type === "order" ? "Order" : "Ticket"} number:
                </span>{" "}
                <span className="font-mono font-semibold text-gray-900">{ticketNumber}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-sm">
              <div>
                <span className="text-gray-500 font-medium">{type === "order" ? "Amount paid:" : "Price:"}</span>{" "}
                <span className="font-semibold text-gray-900">
                  {currency} {Number(amount).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-sm">
              <div>
                <span className="text-gray-500 font-medium">
                  {type === "order" ? "Customer" : type === "ticket" ? "Ticket" : "Vote"} holder:
                </span>{" "}
                <span className="font-semibold text-gray-900">{holder}</span>
              </div>
            </div>
            {quantity > 1 && (
              <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-sm">
                <div>
                  <span className="text-gray-500 font-medium">Quantity:</span>{" "}
                  <span className="font-semibold text-gray-900">
                    {quantity} {qtyLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: QR code */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-inner">
            <QRCodeSVG
              value={reference}
              size={160}
              level="M"
              includeMargin={false}
              className="w-40 h-40"
            />
            <p className="mt-2 text-xs text-gray-500 text-center font-medium">Scan to verify</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Reference: <span className="font-mono">{reference}</span>
      </p>
    </div>
  );
}
