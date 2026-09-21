"use client";

type Props = {
  pdfHref: string;
};

export default function ServiceInvoiceToolbar({ pdfHref }: Props) {
  return (
    <div className="mx-auto mb-4 flex w-full max-w-[816px] items-center justify-end gap-5 px-4 text-[13px] print:hidden sm:px-0">
      <a href={pdfHref} className="font-medium text-neutral-700 underline-offset-2 hover:underline">
        Download PDF
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="font-medium text-neutral-700 underline-offset-2 hover:underline"
      >
        Print
      </button>
    </div>
  );
}
