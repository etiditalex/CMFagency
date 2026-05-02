export type LipaReceiptBalance = {
  totalDueKes: number;
  paidKes: number;
  balanceKes: number;
  completed: boolean;
  ticketQuantity: number;
};

type Props = {
  campaignTitle: string;
  typeLabel: string;
  ticketNumber: string;
  holderName: string;
  amount: string;
  quantity: string;
  reference: string;
  mpesaReceipt?: string;
  /** Nominee / contestant name for vote receipts */
  votedForName?: string;
  eventLocation?: string;
  eventDate?: string;
  eventTime?: string;
  /** Lipa Pole Pole: totals for the selected ticket package (installment plan) */
  lipaBalance?: LipaReceiptBalance | null;
  /** Main card subtitle under campaign title */
  headerSubtitle?: string;
};

export default function ReceiptContent({
  campaignTitle,
  typeLabel,
  ticketNumber,
  holderName,
  amount,
  quantity,
  reference,
  mpesaReceipt,
  votedForName,
  eventLocation,
  eventDate,
  eventTime,
  lipaBalance,
  headerSubtitle = "Payment confirmed",
}: Props) {
  const currency = "KES";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 print:shadow-none print:border">
      <div
        className="p-6 text-center text-white"
        style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" }}
      >
        <h1 className="text-xl font-semibold">{campaignTitle}</h1>
        <p className="mt-1 text-white/90 text-sm">{headerSubtitle}</p>
      </div>
      <div className="p-6 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Your {typeLabel.toLowerCase()}</h2>
        <p className="text-xl font-semibold text-gray-900 mt-1">{holderName}</p>
        {typeLabel === "Vote" && votedForName && (
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            <span className="font-medium text-gray-900">{holderName}</span> voted for{" "}
            <span className="font-semibold text-gray-900">{votedForName}</span>.
          </p>
        )}

        {eventLocation && (
          <div className="mt-4 p-3 bg-amber-50 border-l-4 border-[#D4AF37] rounded-r-lg">
            <p className="text-gray-800 text-sm">
              <strong>{campaignTitle}</strong> will be happening at {eventLocation}.
            </p>
          </div>
        )}

        {lipaBalance ? (
          <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50/90 p-4">
            <h3 className="text-sm font-bold text-primary-900">Your ticket package (Lipa Pole Pole)</h3>
            <p className="mt-1 text-xs text-primary-800/90">
              {lipaBalance.ticketQuantity} ticket{lipaBalance.ticketQuantity === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-primary-950">{campaignTitle}</span>
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-700">Total for this order</dt>
                <dd className="font-semibold text-gray-900">
                  {currency} {lipaBalance.totalDueKes.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-700">Paid toward tickets (total)</dt>
                <dd className="font-semibold text-gray-900">
                  {currency} {lipaBalance.paidKes.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-primary-200/80 pt-2">
                <dt className="font-semibold text-primary-950">Remaining balance</dt>
                <dd className="font-bold text-primary-900">
                  {currency} {lipaBalance.balanceKes.toLocaleString()}
                </dd>
              </div>
            </dl>
            {lipaBalance.completed ? (
              <p className="mt-3 text-xs font-semibold text-green-800">
                This ticket order is fully paid. Your tickets are issued — keep this receipt.
              </p>
            ) : (
              <p className="mt-3 text-xs text-primary-900/90">
                Pay the remaining balance on the CFM Tickets page (Lipa Pole Pole) to complete your tickets.
              </p>
            )}
          </div>
        ) : null}

        <dl className="mt-6 space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600">{typeLabel} number:</dt>
            <dd className="font-mono font-semibold">{ticketNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">{typeLabel === "Order" ? "Customer" : `${typeLabel} holder`}:</dt>
            <dd className="font-mono font-semibold">{holderName}</dd>
          </div>
          {typeLabel === "Vote" && votedForName && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Voted for:</dt>
              <dd className="font-mono font-semibold">{votedForName}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600">{lipaBalance ? "This payment:" : "Amount paid:"}</dt>
            <dd className="font-mono font-semibold">{amount}</dd>
          </div>
          {mpesaReceipt && (
            <div className="flex justify-between">
              <dt className="text-gray-600">M-Pesa receipt:</dt>
              <dd className="font-mono font-semibold">{mpesaReceipt}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600">Quantity:</dt>
            <dd className="font-mono font-semibold">{quantity}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-gray-500">
          Reference: <code className="bg-gray-200 px-1.5 py-0.5 rounded font-mono">{reference}</code>
        </p>

        {(eventDate || eventTime || eventLocation) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Event details</h3>
            {eventDate && (
              <p className="text-sm text-gray-600">
                📅 {eventDate}
                {eventTime ? ` · ${eventTime}` : ""}
              </p>
            )}
            {eventLocation && !eventDate && <p className="text-sm text-gray-600">📍 {eventLocation}</p>}
          </div>
        )}
      </div>
      <p className="px-6 pb-6 text-center text-xs text-gray-400">CMF Agency · Changer Fusions</p>
    </div>
  );
}
