"use client";

type Tab<T extends string> = { id: T; label: string; badge?: number };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
};

export default function SegmentedTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
              active ? "bg-fx-accentSoft text-fx-accent" : "bg-transparent text-fx-muted"
            }`}
          >
            {tab.label}
            {tab.badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
