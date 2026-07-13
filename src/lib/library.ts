import type { AssetType } from "@/lib/enums";
import type { IconName } from "@/components/ui/icons";

// The sidebar exposes four library views. Keys stay stable (IMAGE/THUMBNAIL/
// VIDEO/BLOGPOST) — only the labels are the client's vocabulary. VIDEO_SCRIPT
// assets (generated scripts) live alongside uploaded videos under "Video".
export const LIBRARY_VIEWS = [
  { key: "IMAGE", label: "Image/Posts", icon: "📸", types: ["IMAGE"] },
  { key: "THUMBNAIL", label: "Carousels", icon: "🗂️", types: ["THUMBNAIL"] },
  { key: "VIDEO", label: "Video", icon: "🎬", types: ["VIDEO", "VIDEO_SCRIPT"] },
  { key: "BLOGPOST", label: "Articles", icon: "📰", types: ["BLOGPOST"] },
  { key: "OTHER", label: "Other", icon: "📦", types: ["OTHER"] },
] as const;

export type LibraryViewKey = (typeof LIBRARY_VIEWS)[number]["key"];

export const LIBRARY_SLUGS: Record<LibraryViewKey, string> = {
  IMAGE: "images",
  THUMBNAIL: "thumbnails",
  VIDEO: "videos",
  BLOGPOST: "blog-posts",
  OTHER: "other",
};

export const SLUG_TO_VIEW: Record<string, LibraryViewKey> = {
  images: "IMAGE",
  thumbnails: "THUMBNAIL",
  videos: "VIDEO",
  "blog-posts": "BLOGPOST",
  other: "OTHER",
};

export function typesForView(key: LibraryViewKey): AssetType[] {
  return LIBRARY_VIEWS.find((v) => v.key === key)!.types as unknown as AssetType[];
}

// Save-dialog categories.
export const CATEGORY_OPTIONS = [
  { value: "IMAGE", label: "Image/Posts" },
  { value: "THUMBNAIL", label: "Carousels" },
  { value: "VIDEO", label: "Video" },
  { value: "BLOGPOST", label: "Articles" },
  { value: "OTHER", label: "Other" },
] as const;

export const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Image/Posts",
  THUMBNAIL: "Carousels",
  VIDEO: "Video",
  BLOGPOST: "Articles",
  VIDEO_SCRIPT: "Video script",
  OTHER: "Other",
};

export const TYPE_ICONS: Record<string, string> = {
  IMAGE: "📸",
  THUMBNAIL: "🗂️",
  VIDEO: "🎬",
  BLOGPOST: "📰",
  VIDEO_SCRIPT: "🎬",
  OTHER: "📦",
};

// Line-icon (SVG) equivalents of the category emojis — the same set the sidebar
// uses. Prefer these over TYPE_ICONS for a cleaner, consistent look.
export const TYPE_ICON_NAMES: Record<string, IconName> = {
  IMAGE: "images",
  THUMBNAIL: "thumbnails",
  VIDEO: "videos",
  BLOGPOST: "blog",
  VIDEO_SCRIPT: "videos",
  OTHER: "other",
};
