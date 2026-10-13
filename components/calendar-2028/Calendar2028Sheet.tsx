import Image from "next/image";
import { CALENDAR_LOGO, CALENDAR_STOPS } from "@/components/calendar-2028/calendar-2028-data";

export default function Calendar2028Sheet() {
  return (
    <section className="calendar-2028" aria-labelledby="calendar-2028-heading">
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

        <div className="cal-frame">
          <h1 id="calendar-2028-heading">2028 Calendar</h1>
          <div className="cal-table-wrap">
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
                {CALENDAR_STOPS.map((stop, index) => (
                  <tr key={stop.date}>
                    <td>{index + 1}</td>
                    <td>{stop.month}</td>
                    <td>
                      <time dateTime={stop.date}>{stop.day}</time>
                    </td>
                    <td>{stop.host}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
