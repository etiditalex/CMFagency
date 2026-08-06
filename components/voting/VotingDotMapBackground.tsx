/**
 * Decorative page background for the voting hub: an even dot wash plus Africa, Kenya and Kenyan
 * coast silhouettes rendered as dot matrices, matching the dotted treatment used on the CMFA
 * registration page.
 *
 * Outlines are hand-simplified to a handful of points inside a 0–100 square — recognisable at
 * background scale, and cheap enough that each map is a single `<path>` filled with an SVG dot
 * pattern rather than hundreds of `<circle>` elements.
 */

/** Mainland Africa, with Madagascar as a second subpath. */
const AFRICA_PATH =
  "M10,14 L18,11 L28,12 L32,14.5 L36,11 L46,12 L52,13 L56,17 L58,22 L62,27 L66,31 L72,33 L80,35 L86,38 L82,44 L76,50 L70,55 L68,60 L66,66 L64,71 L58,76 L54,80 L48,85 L42,87 L38,83 L34,77 L31,70 L29,63 L28,57 L30,52 L30,47 L24,46 L18,45 L12,43 L7,41 L3,37 L1,32 L2,28 L5,24 L7,19 Z " +
  "M74,62 L78,66 L79.5,72 L76,77 L73,74 L71.5,68 Z";

/** Kenya: Ilemi in the north, the Somalia border east, the Tanzania diagonal south-west. */
const KENYA_PATH =
  "M30,3 L40,8 L58,14 L78,12 L84,22 L86,34 L92,46 L86,54 L78,62 L70,72 L62,80 L44,66 L26,54 L14,46 L6,44 L4,36 L10,30 L12,22 L16,14 L22,10 Z";

/** The coastal strip from Kiunga down to Vanga, as a crescent running north-east to south-west. */
const COAST_PATH =
  "M72,4 L62,22 L52,40 L40,58 L28,76 L16,92 L4,86 L14,68 L26,50 L38,32 L48,16 L58,2 Z";

type DottedMapProps = {
  /** Must be unique per instance: it namespaces the SVG pattern definition. */
  id: string;
  d: string;
  /**
   * Dot spacing and size in viewBox units. SVG patterns scale with the viewBox, so a map rendered
   * larger needs a proportionally smaller pitch to keep dots the same size on screen.
   */
  pitch: number;
  radius: number;
  color: string;
  opacity: number;
  className: string;
};

function DottedMap({ id, d, pitch, radius, color, opacity, className }: DottedMapProps) {
  const patternId = `voting-map-dots-${id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`absolute ${className}`}
      style={{ opacity }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r={radius} fill={color} />
        </pattern>
      </defs>
      <path d={d} fill={`url(#${patternId})`} />
    </svg>
  );
}

export default function VotingDotMapBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Even wash of dots behind everything, so the pattern reads on the parts of the page the
          map silhouettes do not reach. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(163,209,223,0.30) 1.7px, transparent 1.9px)",
          backgroundSize: "24px 24px",
        }}
      />

      <DottedMap
        id="africa-top"
        d={AFRICA_PATH}
        pitch={1.9}
        radius={0.42}
        color="#ffffff"
        opacity={0.34}
        className="-left-[10%] top-8 h-[24rem] w-[24rem] sm:h-[32rem] sm:w-[32rem] lg:h-[44rem] lg:w-[44rem]"
      />

      <DottedMap
        id="kenya-mid"
        d={KENYA_PATH}
        pitch={3.1}
        radius={0.7}
        color="#a3d1df"
        opacity={0.6}
        className="-right-[6%] top-[28%] h-[18rem] w-[18rem] sm:h-[24rem] sm:w-[24rem] lg:h-[30rem] lg:w-[30rem]"
      />

      <DottedMap
        id="coast-lower"
        d={COAST_PATH}
        pitch={3.7}
        radius={0.82}
        color="#8fb8ef"
        opacity={0.65}
        className="hidden md:block left-[3%] top-[58%] h-[22rem] w-[22rem] lg:h-[28rem] lg:w-[28rem]"
      />

      <DottedMap
        id="africa-bottom"
        d={AFRICA_PATH}
        pitch={2.6}
        radius={0.6}
        color="#a3d1df"
        opacity={0.28}
        className="hidden lg:block -right-[4%] bottom-[3%] h-[26rem] w-[26rem]"
      />
    </div>
  );
}
