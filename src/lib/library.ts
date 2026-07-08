import type { AssetType } from "@/lib/enums";

// The sidebar exposes four library views; VIDEO_SCRIPT assets (generated
// scripts) live alongside uploaded videos under "Videos".
export const LIBRARY_VIEWS = [
  { key: "IMAGE", label: "Images", icon: "🖼", types: ["IMAGE"] },
  { key: "THUMBNAIL", label: "Thumbnails", icon: "🎯", types: ["THUMBNAIL"] },
  { key: "VIDEO", label: "Videos", icon: "🎬", types: ["VIDEO", "VIDEO_SCRIPT"] },
  { key: "BLOGPOST", label: "Blog posts", icon: "📝", types: ["BLOGPOST"] },
] as const;

export type LibraryViewKey = (typeof LIBRARY_VIEWS)[number]["key"];

export const LIBRARY_SLUGS: Record<LibraryViewKey, string> = {
  IMAGE: "images",
  THUMBNAIL: "thumbnails",
  VIDEO: "videos",
  BLOGPOST: "blog-posts",
};

export const SLUG_TO_VIEW: Record<string, LibraryViewKey> = {
  images: "IMAGE",
  thumbnails: "THUMBNAIL",
  videos: "VIDEO",
  "blog-posts": "BLOGPOST",
};

export function typesForView(key: LibraryViewKey): AssetType[] {
  return LIBRARY_VIEWS.find((v) => v.key === key)!.types as unknown as AssetType[];
}

// Save-dialog categories (the four the spec lists).
export const CATEGORY_OPTIONS = [
  { value: "IMAGE", label: "Image" },
  { value: "THUMBNAIL", label: "Thumbnail" },
  { value: "VIDEO", label: "Video" },
  { value: "BLOGPOST", label: "Blog post" },
] as const;

export const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Image",
  THUMBNAIL: "Thumbnail",
  VIDEO: "Video",
  BLOGPOST: "Blog post",
  VIDEO_SCRIPT: "Video script",
};

export const TYPE_ICONS: Record<string, string> = {
  IMAGE: "🖼",
  THUMBNAIL: "🎯",
  VIDEO: "🎬",
  BLOGPOST: "📝",
  VIDEO_SCRIPT: "🎬",
};
