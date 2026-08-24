export const FX_CARD_SHADOW = "0 4px 12px rgba(0,0,0,0.06)";

export type ProjectStatus = "inProgress" | "completed";

export type FusionProject = {
  id: string;
  title: string;
  client: string;
  href: string;
  imageUrl: string | null;
  status: ProjectStatus;
  progress: number;
  updatedLabel: string;
};

export function campaignToStatus(params: {
  isActive: boolean;
  endsAt?: string | null;
}): ProjectStatus {
  if (!params.isActive) return "completed";
  if (params.endsAt) {
    const end = Date.parse(params.endsAt);
    if (Number.isFinite(end) && end <= Date.now()) return "completed";
  }
  return "inProgress";
}

export function campaignToProgress(params: {
  status: ProjectStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  successfulTransactions?: number;
}): number {
  if (params.status === "completed") return 100;
  const start = Date.parse(params.startsAt || params.createdAt || "") || Date.now();
  const end = params.endsAt ? Date.parse(params.endsAt) : NaN;
  if (Number.isFinite(end) && end > start) {
    const now = Date.now();
    if (now <= start) return 8;
    const pct = Math.round(((now - start) / (end - start)) * 100);
    return Math.min(95, Math.max(8, pct));
  }
  const tx = Math.max(0, params.successfulTransactions ?? 0);
  return Math.min(92, 18 + tx * 7);
}

export function formatProjectDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}
