/** M-Pesa Paybill printed on Fusion Xpress generated invoices and shown in the dashboard. */
export const INVOICE_MPESA_PAYBILL = "880100";
export const INVOICE_MPESA_ACCOUNT = "777347";
/** Send-money number used when a receipt payment method is M-Pesa transfer. */
export const INVOICE_MPESA_SEND_TO = "254796988686";

export const RECEIPT_PAYMENT_METHODS = [
  "M-Pesa transfer",
  "M-Pesa Paybill",
  "Bank transfer",
  "Card / Paystack",
  "Cash",
] as const;

export type ReceiptPaymentMethod = (typeof RECEIPT_PAYMENT_METHODS)[number];

export type ReceiptPaymentDestination = {
  destinationValue: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  accountValue: string;
  accountLabel: string | null;
  accountPlaceholder: string;
  showDestination: boolean;
  showAccount: boolean;
  showReference: boolean;
  referenceLabel: string;
  referencePlaceholder: string;
  pdfDestinationLabel: string;
  pdfAccountLabel: string | null;
};

export function getReceiptPaymentDestination(method: string): ReceiptPaymentDestination {
  switch (method) {
    case "M-Pesa Paybill":
      return {
        destinationValue: INVOICE_MPESA_PAYBILL,
        destinationLabel: "Paybill number",
        destinationPlaceholder: INVOICE_MPESA_PAYBILL,
        accountValue: INVOICE_MPESA_ACCOUNT,
        accountLabel: "Account number",
        accountPlaceholder: INVOICE_MPESA_ACCOUNT,
        showDestination: true,
        showAccount: true,
        showReference: true,
        referenceLabel: "M-Pesa reference",
        referencePlaceholder: "e.g. UH43P23PUP",
        pdfDestinationLabel: "Paybill No",
        pdfAccountLabel: "Account No",
      };
    case "M-Pesa transfer":
      return {
        destinationValue: INVOICE_MPESA_SEND_TO,
        destinationLabel: "Received on number",
        destinationPlaceholder: `e.g. ${INVOICE_MPESA_SEND_TO}`,
        accountValue: "",
        accountLabel: null,
        accountPlaceholder: "",
        showDestination: true,
        showAccount: false,
        showReference: true,
        referenceLabel: "M-Pesa reference",
        referencePlaceholder: "e.g. UH43P23PUP",
        pdfDestinationLabel: "Received on M-Pesa number",
        pdfAccountLabel: null,
      };
    case "Bank transfer":
      return {
        destinationValue: "",
        destinationLabel: "Received into account",
        destinationPlaceholder: "Bank account number",
        accountValue: "",
        accountLabel: null,
        accountPlaceholder: "",
        showDestination: true,
        showAccount: false,
        showReference: true,
        referenceLabel: "Bank reference",
        referencePlaceholder: "e.g. transfer narration",
        pdfDestinationLabel: "Received into account",
        pdfAccountLabel: null,
      };
    case "Card / Paystack":
      return {
        destinationValue: "",
        destinationLabel: "Received via",
        destinationPlaceholder: "",
        accountValue: "",
        accountLabel: null,
        accountPlaceholder: "",
        showDestination: false,
        showAccount: false,
        showReference: true,
        referenceLabel: "Paystack / card reference",
        referencePlaceholder: "e.g. transaction reference",
        pdfDestinationLabel: "Received via",
        pdfAccountLabel: null,
      };
    case "Cash":
      return {
        destinationValue: "",
        destinationLabel: "Received on number",
        destinationPlaceholder: "",
        accountValue: "",
        accountLabel: null,
        accountPlaceholder: "",
        showDestination: false,
        showAccount: false,
        showReference: false,
        referenceLabel: "Reference",
        referencePlaceholder: "",
        pdfDestinationLabel: "Received on number",
        pdfAccountLabel: null,
      };
    default:
      return {
        destinationValue: "",
        destinationLabel: "Received on number",
        destinationPlaceholder: "",
        accountValue: "",
        accountLabel: null,
        accountPlaceholder: "",
        showDestination: true,
        showAccount: false,
        showReference: true,
        referenceLabel: "Reference",
        referencePlaceholder: "",
        pdfDestinationLabel: "Received on number",
        pdfAccountLabel: null,
      };
  }
}
