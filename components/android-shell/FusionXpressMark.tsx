type MarkProps = {
  size?: number;
  className?: string;
  variant?: "glyph" | "tile";
};

/** FX logomark: orange-to-purple, matching the Fusion Xpress app spec. */
export default function FusionXpressMark({
  size = 96,
  className = "",
  variant = "glyph",
}: MarkProps) {
  const gid = `fxMark${variant}${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${gid}F`} x1="8" y1="12" x2="58" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={`${gid}X`} x1="40" y1="16" x2="92" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7B2FF7" />
        </linearGradient>
      </defs>
      {variant === "tile" ? <rect width="96" height="96" rx="26" fill="#1A1A2E" /> : null}
      <path
        fill={`url(#${gid}F)`}
        d="M18 20c0-3.3 2.7-6 6-6h26c2.8 0 5 2.2 5 5s-2.2 5-5 5H35v12h16c2.8 0 5 2.2 5 5s-2.2 5-5 5H35v24c0 2.8-2.2 5-5 5s-5-2.2-5-5V20z"
      />
      <path
        fill={`url(#${gid}X)`}
        d="M58.2 26.2 69 15.4c2.2-2.2 5.8-2.2 8 0s2.2 5.8 0 8L66.2 34.2 77.4 45.4c2.2 2.2 2.2 5.8 0 8s-5.8 2.2-8 0L58.2 42.2 47 53.4c-2.2 2.2-5.8 2.2-8 0s-2.2-5.8 0-8l11.2-11.2L38.8 23.4c-2.2-2.2-2.2-5.8 0-8s5.8-2.2 8 0l11.4 10.8z"
      />
    </svg>
  );
}
