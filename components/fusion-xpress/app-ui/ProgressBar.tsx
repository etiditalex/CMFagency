type Props = {
  value: number;
  className?: string;
};

export default function ProgressBar({ value, className = "" }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-fx-accentSoft">
        <div className="h-full rounded-full bg-fx-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-fx-accent">{pct}%</span>
    </div>
  );
}
