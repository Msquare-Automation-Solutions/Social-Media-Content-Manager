// App logo mark: a rounded tile in the brand teal→green gradient holding a
// bold "generate" sparkle (with a small companion star) — the universal symbol
// for AI content generation. Self-contained SVG (background included) so it
// drops in anywhere at any size.
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Social Media Content Manager logo"
    >
      <defs>
        <linearGradient id="mc-logo-bg" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16C6AE" />
          <stop offset="0.55" stopColor="#0BA793" />
          <stop offset="1" stopColor="#076C60" />
        </linearGradient>
      </defs>

      {/* App-icon tile */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#mc-logo-bg)" />
      {/* top-edge sheen */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="white" opacity="0.06" />

      {/* Main generate-spark */}
      <path
        d="M21 9c1.3 9.75 3.25 11.7 13 13-9.75 1.3-11.7 3.25-13 13-1.3-9.75-3.25-11.7-13-13 9.75-1.3 11.7-3.25 13-13Z"
        fill="white"
      />
      {/* Companion spark, top-right */}
      <path
        d="M34 8c.5 3.75 1.25 4.5 5 5-3.75.5-4.5 1.25-5 5-.5-3.75-1.25-4.5-5-5 3.75-.5 4.5-1.25 5-5Z"
        fill="white"
        opacity="0.92"
      />
    </svg>
  );
}
