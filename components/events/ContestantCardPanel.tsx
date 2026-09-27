"use client";

import { useEffect, useState } from "react";
import { ContestantApplicationCard } from "@/components/events/ContestantApplicationCard";
import { downloadContestantCard } from "@/components/events/download-contestant-card";
import {
  contestantCardPath,
  formatIdealFeeKes,
  IDEAL_APPLICATION_FEE_DEFAULT_KES,
  type ContestantCardData,
} from "@/lib/ideal-mr-miss";

export function ContestantCardPanel({
  card,
  emailedTo,
  showIntro = true,
  feeKes = IDEAL_APPLICATION_FEE_DEFAULT_KES,
}: {
  card: ContestantCardData;
  emailedTo?: string | null;
  showIntro?: boolean;
  feeKes?: number;
}) {
  const [qrValue, setQrValue] = useState(() => contestantCardPath(card.applicationCode));
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setQrValue(`${window.location.origin}${contestantCardPath(card.applicationCode)}`);
  }, [card.applicationCode]);

  async function onDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadContestantCard(card, qrValue);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Could not download the card.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="text-center">
      {showIntro ? (
        <>
          <h2 className="text-xl font-bold text-gray-900">Application received</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-gray-600">
            Keep this application ID. Changer Fusions will review the entry for Kenya’s Ideal Mr &amp; Miss 2026 and
            contact you with payment and participation instructions. The registration fee is {formatIdealFeeKes(feeKes)}. Submitting an
            application does not guarantee selection.
          </p>
          {emailedTo ? (
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-700">
              A copy of this application ID was sent to {emailedTo}.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="mx-auto mt-6 max-w-2xl text-left">
        <ContestantApplicationCard card={card} qrValue={qrValue} />
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-700 px-5 text-sm font-semibold text-white hover:bg-secondary-800 disabled:opacity-60 sm:w-auto"
      >
        {downloading ? "Preparing card…" : "Download application card"}
      </button>
      {downloadError ? <p className="mt-3 text-sm text-negative">{downloadError}</p> : null}
    </div>
  );
}
