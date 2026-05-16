import type { VisitorRecord, VisitorStatus } from "./types";
import { TODAY_YMD } from "./mock-data";

export function formatVisitDateTime(visitDate: string, visitTime: string) {
  const d = new Date(`${visitDate}T${visitTime || "00:00"}`);
  if (Number.isNaN(d.getTime())) {
    return `${visitDate} ${visitTime}`;
  }
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function visitorStats(visitors: VisitorRecord[]) {
  const today = visitors.filter((v) => v.visitDate === TODAY_YMD);
  return {
    todaysVisitors: today.length,
    pendingApprovals: visitors.filter((v) => v.status === "pending").length,
    checkedIn: visitors.filter((v) => v.status === "checked_in").length,
    checkedOut: visitors.filter((v) => v.status === "checked_out").length,
  };
}

export function statusLabel(status: VisitorStatus): string {
  const labels: Record<VisitorStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    checked_in: "Checked in",
    checked_out: "Checked out",
  };
  return labels[status];
}

export function statusBadgeClass(status: VisitorStatus): string {
  const styles: Record<VisitorStatus, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    checked_in: "bg-emerald-100 text-emerald-800 border-emerald-200",
    checked_out: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return styles[status];
}

export function generateQrToken(visitorId: string) {
  return `FX-VIS-${visitorId}`;
}

export function createVisitorId() {
  return `vis_${Date.now().toString(36)}`;
}

/** Deterministic pseudo-random grid for mock QR display (not scannable production QR). */
export function qrGridFromToken(token: string, size = 21): boolean[][] {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  const grid: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
      const finderOn =
        r === 0 ||
        r === 6 ||
        c === 0 ||
        c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      if (inFinder) {
        row.push(finderOn);
      } else {
        hash = (hash * 1103515245 + 12345 + r * size + c) | 0;
        row.push((hash & 3) > 0);
      }
    }
    grid.push(row);
  }
  return grid;
}
