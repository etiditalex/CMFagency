import type { ProjectStatus } from "@/lib/fusion-xpress-app";

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const completed = status === "completed";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        completed ? "bg-fx-successBg text-fx-success" : "bg-fx-warnBg text-fx-warn"
      }`}
    >
      {completed ? "Completed" : "In Progress"}
    </span>
  );
}
