import type { CSSProperties } from "react";

// Real brand marks for the social platforms the workspace ships with. Matched on
// the platform's normalized name; custom platforms fall back to their stored
// emoji. Each SVG is a single filled path in a 24×24 viewBox so it scales
// cleanly. `mono` renders the mark in the current text color (for colored tiles
// where the brand color would clash); otherwise brand colors are used.

type BrandKey =
  | "meta"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "facebook"
  | "tiktok"
  | "reddit"
  | "skool"
  | "medium"
  | "x"
  | "blog";

// Normalize a stored channel name to a known brand key.
function brandKey(name: string): BrandKey | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  // Combined Instagram + Facebook platform → the Meta mark. Checked first so the
  // individual instagram/facebook matches below don't win.
  if (n.includes("meta") || (n.includes("instagram") && n.includes("facebook"))) return "meta";
  if (n.includes("instagram")) return "instagram";
  if (n.includes("youtube")) return "youtube";
  if (n.includes("linkedin")) return "linkedin";
  if (n.includes("facebook")) return "facebook";
  if (n.includes("tiktok")) return "tiktok";
  if (n.includes("reddit")) return "reddit";
  if (n.includes("skool")) return "skool";
  if (n.includes("medium")) return "medium";
  if (n === "x" || n.includes("twitter")) return "x";
  if (n.includes("blog") || n.includes("website") || n.includes("web")) return "blog";
  return null;
}

// Brand color for each mark (used when not mono).
const BRAND_COLOR: Record<BrandKey, string> = {
  meta: "#0866ff",
  instagram: "#e1306c",
  youtube: "#ff0000",
  linkedin: "#0a66c2",
  facebook: "#1877f2",
  tiktok: "#010101",
  reddit: "#ff4500",
  skool: "#f59e0b",
  medium: "#000000",
  x: "#000000",
  blog: "#0e9f8f",
};

// Single-path brand glyphs (fill = currentColor via the parent's color).
const PATHS: Record<BrandKey, string> = {
  meta:
    "M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.158-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.02-.288z",
  medium:
    "M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z",
  youtube:
    "M23.5 6.5a3 3 0 0 0-2.11-2.12C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.52A3 3 0 0 0 .5 6.5 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.12c1.89.52 9.39.52 9.39.52s7.5 0 9.39-.52a3 3 0 0 0 2.11-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.5ZM9.6 15.6V8.4l6.2 3.6Z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77A1.75 1.75 0 0 0 0 1.73v20.54A1.75 1.75 0 0 0 1.77 24h20.45A1.76 1.76 0 0 0 24 22.27V1.73A1.76 1.76 0 0 0 22.22 0Z",
  facebook:
    "M24 12a12 12 0 1 0-13.87 11.85v-8.38H7.08V12h3.05V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z",
  tiktok:
    "M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v13.2a2.4 2.4 0 1 1-2.4-2.4c.2 0 .4.03.6.08v-3.36a5.9 5.9 0 0 0-.6-.03A5.75 5.75 0 1 0 15.6 16.2V9.4a7.5 7.5 0 0 0 4.4 1.42V7.5a4.28 4.28 0 0 1-3.4-1.68Z",
  reddit:
    "M24 11.78a2.34 2.34 0 0 0-3.96-1.68 11.5 11.5 0 0 0-6.24-1.98l1.06-5 3.47.74a1.67 1.67 0 1 0 .18-1.02l-3.87-.82a.5.5 0 0 0-.6.39l-1.18 5.55a11.5 11.5 0 0 0-6.33 1.98A2.34 2.34 0 1 0 3.3 13.5a4.6 4.6 0 0 0-.05.7c0 3.55 4.13 6.42 9.23 6.42s9.23-2.87 9.23-6.42a4.6 4.6 0 0 0-.05-.7A2.34 2.34 0 0 0 24 11.78ZM7.75 13.44a1.67 1.67 0 1 1 1.67 1.67 1.67 1.67 0 0 1-1.67-1.67Zm9.31 4.4a5.94 5.94 0 0 1-3.55 1.02 5.94 5.94 0 0 1-3.55-1.02.42.42 0 0 1 .59-.59 5.14 5.14 0 0 0 2.96.82 5.14 5.14 0 0 0 2.96-.82.42.42 0 1 1 .59.59Zm-.42-2.73a1.67 1.67 0 1 1 1.67-1.67 1.67 1.67 0 0 1-1.67 1.67Z",
  skool:
    "M3 6.5 12 2l9 4.5-9 4.5-9-4.5Zm2.4 3.3L12 13l6.6-3.2v3.9c0 .3-.16.58-.43.72L12 17.7l-6.17-3.28a.82.82 0 0 1-.43-.72V9.8Z",
  x: "M18.24 2.25h3.31l-7.23 8.26L22.85 21.75h-6.66l-5.22-6.82-5.97 6.82H1.68l7.73-8.84L1.14 2.25h6.83l4.72 6.24Zm-1.16 17.52h1.83L7.02 4.13H5.06Z",
  blog:
    "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2.5 4a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2h-11Zm0 4a1 1 0 1 0 0 2h11a1 1 0 1 0 0-2h-11Zm0 4a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-7Z",
};

export function PlatformIcon({
  name,
  icon,
  size = 16,
  mono = false,
  className = "",
  style,
}: {
  name: string;
  icon?: string; // stored emoji fallback for custom platforms
  size?: number;
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const key = brandKey(name);
  if (!key) {
    // Custom platform — render the stored emoji (or a generic dot).
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.9, lineHeight: 1, ...style }}
        aria-hidden
      >
        {icon || "✨"}
      </span>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={mono ? "currentColor" : BRAND_COLOR[key]}
      className={className}
      style={style}
      role="img"
      aria-label={name}
    >
      <path d={PATHS[key]} />
    </svg>
  );
}
