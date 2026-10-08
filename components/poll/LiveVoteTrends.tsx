"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { PollOption } from "@/components/poll/live-polls-sample";

const RANGES = ["15M", "30M", "1H", "24H", "1W", "1M"] as const;
type RangeId = (typeof RANGES)[number];

const SERIES = ["#1e58ca", "#5c4db5", "#1F9D6C", "#e07a00", "#1a4ba8", "#2ca57c", "#3b79da", "#0f2f64"];

const LABELS: Record<RangeId, string[]> = {
  "15M": ["3:00", "3:03", "3:06", "3:09", "3:12", "3:15"],
  "30M": ["2:45", "2:55", "3:05", "3:15"],
  "1H": ["2:15", "2:30", "2:45", "3:00", "3:15"],
  "24H": ["04:30 PM", "06:30 PM", "08:30 PM", "10:30 PM", "12:30 AM", "02:30 AM", "04:30 AM", "06:30 AM", "08:30 AM", "10:30 AM", "12:30 PM", "03:00 PM"],
  "1W": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "1M": ["1 Oct", "6 Oct", "11 Oct", "16 Oct", "21 Oct", "26 Oct"],
};

const WIDTH = 760;
const HEIGHT = 250;
const PAD = { left: 46, right: 16, top: 16, bottom: 34 };

function axisMax(value: number) {
  if (value <= 0) return 4;
  const padded = value * 1.12;
  const power = 10 ** Math.floor(Math.log10(padded));
  const scaled = padded / power;
  const step = [1, 2, 2.5, 5, 10].find((item) => item >= scaled) ?? 10;
  return step * power;
}

export default function LiveVoteTrends({ options }: { options: PollOption[] }) {
  const [range, setRange] = useState<RangeId>("24H");
  const labels = LABELS[range];
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const max = useMemo(() => axisMax(Math.max(...options.map((option) => option.votes), 0)), [options]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => Math.round(max * step));

  const yFor = (votes: number) => PAD.top + (1 - votes / max) * plotHeight;
  const xFor = (index: number) => PAD.left + (labels.length === 1 ? plotWidth / 2 : (index / (labels.length - 1)) * plotWidth);

  return (
    <section className="mt-8 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="live-vote-trends-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="live-vote-trends-heading" className="flex items-center gap-2 text-primary-950">
          <BarChart3 className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
          Live Vote Trends
        </h2>
        <div className="flex flex-wrap gap-1 self-start rounded-xl bg-primary-50 p-1 sm:self-auto" role="group" aria-label="Trend range">
          {RANGES.map((item) => {
            const selected = item === range;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => setRange(item)}
                className={`min-h-8 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  selected ? "bg-primary-600 text-white shadow-sm" : "text-ink-muted hover:bg-white hover:text-primary-800"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto min-w-[680px] w-full" role="img" aria-label="Sample vote trend lines">
          {ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#e4e7ef" strokeWidth="1" />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#6b6b7a" fontSize="12">
                  {tick.toLocaleString("en-KE")}
                </text>
              </g>
            );
          })}
          {options.map((option, index) => {
            const y = yFor(option.votes);
            return (
              <line
                key={option.name}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y}
                y2={y}
                stroke={SERIES[index % SERIES.length]}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
          {labels.map((label, index) => (
            <text key={`${range}-${label}`} x={xFor(index)} y={HEIGHT - 8} textAnchor="middle" fill="#6b6b7a" fontSize="11">
              {label}
            </text>
          ))}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {options.map((option, index) => (
          <li key={option.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-900">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES[index % SERIES.length] }} aria-hidden />
            {option.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
