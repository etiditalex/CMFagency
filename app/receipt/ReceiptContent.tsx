type Props = {
  campaignTitle: string;
  typeLabel: string;
  ticketNumber: string;
  holderName: string;
  amount: string;
  quantity: string;
  reference: string;
  mpesaReceipt?: string;
  eventLocation?: string;
  eventDate?: string;
  eventTime?: string;
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
  eventLocation,
  eventDate,
  eventTime,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 print:shadow-none print:border">
      <div
        className="p-6 text-center text-white"
        style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" }}
      >
        <h1 className="text-xl font-semibold">{campaignTitle}</h1>
        <p className="mt-1 text-white/90 text-sm">M-Pesa payment confirmed</p>
      </div>
      <div className="p-6 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Your {typeLabel.toLowerCase()}</h2>
        <p className="text-xl font-semibold text-gray-900 mt-1">{holderName}</p>

        {eventLocation && (
          <div className="mt-4 p-3 bg-amber-50 border-l-4 border-[#D4AF37] rounded-r-lg">
            <p className="text-gray-800 text-sm">
              <strong>{campaignTitle}</strong> will be happening at {eventLocation}.
            </p>
          </div>
        )}

        <dl className="mt-6 space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600">{typeLabel} number:</dt>
            <dd className="font-mono font-semibold">{ticketNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">{typeLabel === "Order" ? "Customer" : `${typeLabel} holder`}:</dt>
            <dd className="font-mono font-semibold">{holderName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Amount paid:</dt>
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
