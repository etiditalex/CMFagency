"use client";

import type {
  AttendanceSummaryDailyPoint,
  AttendanceSummaryHourlyPoint,
} from "@/lib/employees/attendance-summary";

type BarSeriesProps = {
  title: string;
  subtitle?: string;
  points: { label: string; signIns: number; signOuts: number }[];
  maxBars?: number;
};

function maxCount(points: { signIns: number; signOuts: number }[]): number {
  let m = 1;
  for (const p of points) {
    m = Math.max(m, p.signIns, p.signOuts);
  }
  return m;
}

function GroupedBarChart({ title, subtitle, points, maxBars = 31 }: BarSeriesProps) {
  const visible = points.length > maxBars ? points.slice(-maxBars) : points;
  const peak = maxCount(visible);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:break-inside-avoid">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No attendance in this period.</p>
      ) : (
        <>
          <div className="flex items-end gap-1 sm:gap-1.5 h-44 overflow-x-auto pb-1">
            {visible.map((p) => {
              const inH = Math.round((p.signIns / peak) * 100);
              const outH = Math.round((p.signOuts / peak) * 100);
              return (
                <div
                  key={`${p.label}-${p.signIns}-${p.signOuts}`}
                  className="flex flex-col items-center min-w-[28px] sm:min-w-[32px] flex-shrink-0"
                  title={`${p.label}: ${p.signIns} sign-in, ${p.signOuts} sign-out`}
                >
                  <div className="flex items-end gap-0.5 h-36 w-full justify-center">
                    <div
                      className="w-2.5 sm:w-3 rounded-t bg-emerald-500"
                      style={{ height: `${Math.max(inH, p.signIns > 0 ? 4 : 0)}%` }}
                    />
                    <div
                      className="w-2.5 sm:w-3 rounded-t bg-sky-600"
                      style={{ height: `${Math.max(outH, p.signOuts > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="mt-1 text-[9px] sm:text-[10px] text-gray-500 truncate max-w-[36px] text-center">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              Sign in
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-600" />
              Sign out
            </span>
          </div>
        </>
      )}
    </section>
  );
}

type LineChartProps = {
  title: string;
  subtitle?: string;
  points: AttendanceSummaryHourlyPoint[];
};

function HourlyLineChart({ title, subtitle, points }: LineChartProps) {
  const w = 640;
  const h = 160;
  const pad = { top: 12, right: 12, bottom: 24, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const peak = Math.max(1, ...points.map((p) => Math.max(p.signIns, p.signOuts)));

  const toX = (i: number) => pad.left + (i / Math.max(points.length - 1, 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - (v / peak) * innerH;

  const signInPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.signIns)}`)
    .join(" ");
  const signOutPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.signOuts)}`)
    .join(" ");

  const hasData = points.some((p) => p.signIns > 0 || p.signOuts > 0);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:break-inside-avoid">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {!hasData ? (
        <p className="text-sm text-gray-500 py-8 text-center">No hourly activity in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full min-w-[320px] max-h-48"
            role="img"
            aria-label="Hourly sign-in and sign-out trend"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + innerH * (1 - t);
              const val = Math.round(peak * t);
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={w - pad.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text x={4} y={y + 4} fontSize={10} fill="#6b7280">
                    {val}
                  </text>
                </g>
              );
            })}
            <path d={signInPath} fill="none" stroke="#10b981" strokeWidth={2.5} />
            <path d={signOutPath} fill="none" stroke="#0284c7" strokeWidth={2.5} />
            {points.map((p, i) =>
              i % 3 === 0 ? (
                <text
                  key={p.hour}
                  x={toX(i)}
                  y={h - 6}
                  fontSize={9}
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              ) : null
            )}
          </svg>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-emerald-500" />
              Sign in (trend)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-sky-600" />
              Sign out (trend)
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

type Props = {
  dailySeries: AttendanceSummaryDailyPoint[];
  hourlySeries: AttendanceSummaryHourlyPoint[];
  rangeLabel: string;
};

export default function AttendanceSummaryCharts({ dailySeries, hourlySeries, rangeLabel }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <GroupedBarChart
        title="Daily sign-in & sign-out"
        subtitle={rangeLabel}
        points={dailySeries}
      />
      <HourlyLineChart
        title="Hourly activity (all days combined)"
        subtitle="Peak arrival and departure times · East Africa Time (EAT)"
        points={hourlySeries}
      />
    </div>
  );
}

