import { Calendar, CircleDollarSign, MapPin } from "lucide-react";
import { Playfair_Display } from "next/font/google";

const fashionSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const TICKETS = [
  { amount: "500", label: "Regular" },
  { amount: "1,500", label: "VIP" },
  { amount: "3,500", label: "VVIP" },
] as const;

const SPARKLES = [
  { top: "8%", left: "38%", size: 5, color: "#E0B84A" },
  { top: "14%", left: "52%", size: 3, color: "#F3E2A0" },
  { top: "18%", left: "61%", size: 6, color: "#C6A04A" },
  { top: "11%", left: "72%", size: 4, color: "#E0B84A" },
  { top: "22%", left: "46%", size: 3, color: "#F7EFCF" },
  { top: "28%", left: "78%", size: 5, color: "#A6842A" },
  { top: "36%", left: "68%", size: 3, color: "#E0B84A" },
  { top: "42%", left: "84%", size: 4, color: "#C6A04A" },
  { top: "16%", left: "88%", size: 3, color: "#F3E2A0" },
  { top: "48%", left: "58%", size: 3, color: "#E0B84A" },
  { top: "54%", left: "74%", size: 5, color: "#D4AF37" },
  { top: "62%", left: "49%", size: 3, color: "#C6A04A" },
  { top: "70%", left: "66%", size: 4, color: "#E0B84A" },
  { top: "24%", left: "33%", size: 3, color: "#F3E2A0" },
  { top: "58%", left: "90%", size: 3, color: "#F7EFCF" },
] as const;

function Ribbons() {
  return (
    <svg
      className="pointer-events-none absolute -left-6 top-0 h-full w-[min(28vw,150px)] sm:-left-4 sm:w-[min(34vw,280px)]"
      viewBox="0 0 280 760"
      preserveAspectRatio="xMinYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="fn-ribbon-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a1408" />
          <stop offset="16%" stopColor="#8a6a1e" />
          <stop offset="38%" stopColor="#f3e2a0" />
          <stop offset="52%" stopColor="#fff8e4" />
          <stop offset="68%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#3a2c0c" />
        </linearGradient>
        <linearGradient id="fn-ribbon-bronze" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#120e08" />
          <stop offset="20%" stopColor="#a6842a" />
          <stop offset="46%" stopColor="#f7efc8" />
          <stop offset="64%" stopColor="#c9a24a" />
          <stop offset="84%" stopColor="#6b5214" />
          <stop offset="100%" stopColor="#1a1408" />
        </linearGradient>
      </defs>
      <path
        d="M78 -30 C 10 80, 168 150, 72 250 C -8 350, 176 420, 80 530 C 4 620, 150 690, 48 800"
        fill="none"
        stroke="url(#fn-ribbon-gold)"
        strokeWidth="58"
        strokeLinecap="round"
      />
      <path
        d="M78 -30 C 10 80, 168 150, 72 250 C -8 350, 176 420, 80 530 C 4 620, 150 690, 48 800"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M168 -20 C 236 100, 78 190, 176 300 C 258 400, 86 490, 188 600 C 250 680, 110 740, 176 820"
        fill="none"
        stroke="url(#fn-ribbon-bronze)"
        strokeWidth="50"
        strokeLinecap="round"
      />
      <path
        d="M168 -20 C 236 100, 78 190, 176 300 C 258 400, 86 490, 188 600 C 250 680, 110 740, 176 820"
        fill="none"
        stroke="rgba(255,255,255,0.62)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FashionNightHero() {
  return (
    <section
      className="fashion-night-hero relative isolate overflow-hidden text-white"
      aria-labelledby="fashion-night-heading"
      style={{
        background:
          "radial-gradient(ellipse 55% 70% at 72% 18%, rgba(212,175,55,0.22), transparent 60%), radial-gradient(ellipse 40% 50% at 18% 80%, rgba(166,132,42,0.16), transparent 55%), #070705",
      }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {SPARKLES.map((dot) => (
          <span
            key={`${dot.top}-${dot.left}`}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              background: dot.color,
              opacity: 0.75,
              boxShadow: `0 0 10px ${dot.color}`,
            }}
          />
        ))}
      </div>

      <Ribbons />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:min-h-[560px] lg:px-8 lg:pb-8 lg:pt-12">
        <div className="relative grid flex-1 items-center gap-8 lg:grid-cols-[minmax(150px,210px)_minmax(0,1fr)_230px] lg:gap-4">
          <div className="hidden lg:block" aria-hidden />

          <div className="relative mx-auto w-full max-w-4xl overflow-x-hidden text-center">
            <div className="relative z-10">
              <p className="fn-date">
                <time dateTime="2025-05-15">Thursday, May 15, 2025</time>
                {" // Coast Region, Kenya"}
              </p>
              <div className="relative mt-3 sm:mt-4">
                <p
                  className={`fn-watermark fn-serif pointer-events-none absolute left-1/2 top-1/2 z-0 w-[140%] -translate-x-1/2 -translate-y-[62%] select-none text-center ${fashionSerif.className}`}
                  aria-hidden
                >
                  Awards
                </p>
                <h1 id="fashion-night-heading" className="relative z-10">
                  2025 FASHION NIGHT
                </h1>
              </div>
              <span className="relative z-10 mx-auto mt-3 block h-[3px] w-12 bg-[#e0b84a]" aria-hidden />
              <p className="fn-kicker relative z-10 mt-4">Coast Fashion &amp; Modelling Awards 2025</p>
              <p className={`fn-script fn-serif relative z-10 mt-2 sm:mt-3 ${fashionSerif.className}`}>
                Celebrating coast talent
              </p>
            </div>
          </div>

          <aside className="relative mx-auto w-full max-w-[240px] lg:mx-0 lg:max-w-none lg:justify-self-end lg:self-center" aria-label="Coast Fashion ticket packages">
            <p className="fn-invest-label mb-2 flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 shrink-0 text-[#e0b84a] sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden />
              <span>Your Investment (Ksh):</span>
            </p>
            <ul>
              {TICKETS.map((ticket, index) => (
                <li
                  key={ticket.label}
                  className={index < TICKETS.length - 1 ? "border-b border-[#e0b84a]/35 py-2.5" : "py-2.5"}
                >
                  <p className="fn-price">{ticket.amount}</p>
                  <p className="fn-price-label mt-1">{ticket.label}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:mt-6 sm:gap-x-7 lg:pl-[210px]">
          <p className="fn-meta inline-flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#e0b84a] sm:h-8 sm:w-8" strokeWidth={1.6} aria-hidden />
            <time dateTime="2025-05-15">May.15</time>
          </p>
          <span className="hidden h-7 w-px bg-white/70 sm:block" aria-hidden />
          <p className="fn-meta">Awards Night</p>
          <span className="hidden h-7 w-px bg-white/70 sm:block" aria-hidden />
          <p className="fn-meta inline-flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e0b84a] text-[#e0b84a] sm:h-8 sm:w-8" aria-hidden>
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
            </span>
            Coast Region, Kenya
          </p>
        </div>
      </div>
    </section>
  );
}
