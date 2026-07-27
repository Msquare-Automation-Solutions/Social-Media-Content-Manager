// App logo mark: a rounded-square in the brand teal→green gradient holding a
// chat bubble with an AI "spark" — chat-first content generation, in one glyph.
// Self-contained SVG (background included) so it drops in anywhere at any size.
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

      {/* Chat bubble */}
      <path
        d="M15 14h18a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H24l-7.2 5.4A1 1 0 0 1 15 42.6V33a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Z"
        fill="white"
      />
      {/* AI spark inside the bubble */}
      <path
        d="M24.5 17.5c.7 3.1 1.9 4.3 5 5-3.1.7-4.3 1.9-5 5-.7-3.1-1.9-4.3-5-5 3.1-.7 4.3-1.9 5-5Z"
        fill="url(#mc-logo-bg)"
      />
      {/* small secondary spark */}
      <circle cx="31.5" cy="28.5" r="1.4" fill="#0BA793" />
    </svg>
  );
}
