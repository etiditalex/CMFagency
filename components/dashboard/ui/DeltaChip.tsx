export function DeltaChip({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (value == null || !Number.isFinite(value)) return null;
  const positive = value >= 0;
  const abs = Math.abs(value);
  const label = `${positive ? "+" : "−"}${abs >= 10 ? abs.toFixed(0) : abs.toFixed(1).replace(/\.0$/, "")}%`;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        positive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
      } ${className}`}
    >
      {label}
    </span>
  );
}
