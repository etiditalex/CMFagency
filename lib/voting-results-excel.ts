import {
  type VotingResultsSnapshot,
  votingResultsFileStamp,
  votingResultsResultLabel,
} from "@/lib/voting-results-data";

export const VOTING_RESULTS_XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type VotingResultsExcelKind = "all" | "winners" | "contestants";

function winnerRows(snapshot: VotingResultsSnapshot) {
  return snapshot.categories.flatMap((cat) => {
    if (cat.winners.length === 0) {
      return [
        {
          Category: cat.title,
          Rank: "" as const,
          Winner: "No votes recorded",
          Votes: 0,
          Result: "Undeclared",
        },
      ];
    }
    return cat.winners.map((w) => ({
      Category: cat.title,
      Rank: w.rank,
      Winner: w.name,
      Votes: w.votes,
      Result: votingResultsResultLabel(w, cat.winners.length),
    }));
  });
}

function contestantRows(snapshot: VotingResultsSnapshot) {
  return snapshot.categories.flatMap((cat) =>
    cat.contestants.map((c) => ({
      Category: cat.title,
      Rank: c.rank,
      Contestant: c.name,
      Votes: c.votes,
      Result: votingResultsResultLabel(c, cat.winners.length),
      Email: c.email ?? "",
    }))
  );
}

export function votingResultsExcelFilename(kind: VotingResultsExcelKind, iso: string): string {
  const stamp = votingResultsFileStamp(iso);
  if (kind === "winners") return `CFMA-2026-category-winners-${stamp}.xlsx`;
  if (kind === "contestants") return `CFMA-2026-all-contestants-${stamp}.xlsx`;
  return `CFMA-2026-voting-results-${stamp}.xlsx`;
}

export async function buildVotingResultsXlsx(
  snapshot: VotingResultsSnapshot,
  kind: VotingResultsExcelKind = "all"
): Promise<{ bytes: Buffer; filename: string }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  if (kind === "all" || kind === "winners") {
    const rows = winnerRows(snapshot);
    const ws = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [{ Category: "", Rank: "", Winner: "", Votes: "", Result: "" }]
    );
    ws["!cols"] = [{ wch: 36 }, { wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Winners");
  }

  if (kind === "all" || kind === "contestants") {
    const rows = contestantRows(snapshot);
    const ws = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [{ Category: "", Rank: "", Contestant: "", Votes: "", Result: "", Email: "" }]
    );
    ws["!cols"] = [{ wch: 36 }, { wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, "All contestants");
  }

  return {
    bytes: Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true })),
    filename: votingResultsExcelFilename(kind, snapshot.generatedAtIso),
  };
}
