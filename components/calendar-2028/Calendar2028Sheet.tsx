"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { CALENDAR_LOGO } from "@/components/calendar-2028/calendar-2028-data";
import { type AwardCalendarStop, calendarParts, calendarYears } from "@/lib/award-calendar";

type Props = {
  stops: AwardCalendarStop[];
  headingId?: string;
  /** Extra top space when the site header sits above the sheet. */
  siteChrome?: boolean;
  /** Keep this sheet on one year, such as the 2028 calendar page. */
  year?: number;
};

export default function Calendar2028Sheet({
  stops,
  headingId = "calendar-2028-heading",
  siteChrome = false,
  year,
}: Props) {
  const years = useMemo(() => calendarYears(stops), [stops]);
  const [activeYear, setActiveYear] = useState(() => (years.includes(2028) ? 2028 : years[0] ?? 2028));
  const shownYear = year ?? activeYear;
  const yearStops = useMemo(
    () => stops.filter((stop) => calendarParts(stop.eventDate).year === shownYear),
    [shownYear, stops]
  );
  const [selectedId, setSelectedId] = useState<string | null>(yearStops[0]?.id ?? null);
  const selected = yearStops.find((stop) => stop.id === selectedId) ?? yearStops[0] ?? null;
  const selectedParts = selected ? calendarParts(selected.eventDate) : null;

  const chooseYear = (next: number) => {
    setActiveYear(next);
    const first = stops.find((stop) => calendarParts(stop.eventDate).year === next);
    setSelectedId(first?.id ?? null);
  };

  return (
    <section className={`calendar-2028${siteChrome ? " calendar-2028--site" : ""}`} aria-labelledby={headingId}>
      <div className="cal-sheet">
        <div className="cal-brand">
          <span className="cal-rule" aria-hidden="true" />
          <Image
            src={CALENDAR_LOGO}
            alt="Kenya Fashion and Creative Arts Awards"
            width={640}
            height={180}
            priority
            className="cal-logo"
          />
          <span className="cal-rule" aria-hidden="true" />
        </div>

        {year == null && years.length > 1 ? (
          <div className="cal-years" role="tablist" aria-label="Calendar year">
            {years.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={item === shownYear}
                className={item === shownYear ? "is-active" : undefined}
                onClick={() => chooseYear(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="cal-frame">
          <h1 id={headingId}>{shownYear} Calendar</h1>
          <div className="cal-table-wrap">
            {yearStops.length === 0 ? (
              <p className="cal-empty">Dates for {shownYear} will be announced.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Month</th>
                    <th scope="col">Date</th>
                    <th scope="col">Host region and county</th>
                  </tr>
                </thead>
                <tbody>
                  {yearStops.map((stop, index) => {
                    const parts = calendarParts(stop.eventDate);
                    const isSelected = selected?.id === stop.id;
                    return (
                      <tr
                        key={stop.id}
                        className={isSelected ? "is-selected" : undefined}
                        onClick={() => setSelectedId(stop.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(stop.id);
                          }
                        }}
                        tabIndex={0}
                        aria-selected={isSelected}
                      >
                        <td>{index + 1}</td>
                        <td>{parts.month}</td>
                        <td>
                          <time dateTime={parts.iso}>{parts.day}</time>
                        </td>
                        <td>{stop.host}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {selected && selectedParts ? (
            <div className="cal-detail" aria-live="polite">
              <p className="cal-detail-date">
                <time dateTime={selectedParts.iso}>{selectedParts.label}</time>
              </p>
              <p className="cal-detail-host">{selected.host}</p>
              {selected.note ? <p className="cal-detail-note">{selected.note}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
