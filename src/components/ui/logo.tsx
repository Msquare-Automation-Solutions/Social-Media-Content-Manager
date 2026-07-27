// App logo mark: a rounded tile in the brand teal→green gradient holding a
// play triangle (video/visual content) with a generate-spark — "create &
// publish media." Self-contained SVG (background included) so it drops in
// anywhere at any size.
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

      {/* Play triangle */}
      <path
        d="M20 15.4c-1.2-.7-2.6.1-2.6 1.5v14.2c0 1.4 1.4 2.2 2.6 1.5l12.4-7.1c1.2-.7 1.2-2.4 0-3.1L20 15.4Z"
        fill="white"
      />
      {/* Generate-spark, top-right */}
      <path
        d="M36 10c.45 3.35 1.15 4.05 4.5 4.5-3.35.45-4.05 1.15-4.5 4.5-.45-3.35-1.15-4.05-4.5-4.5 3.35-.45 4.05-1.15 4.5-4.5Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
