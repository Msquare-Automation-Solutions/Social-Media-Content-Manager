"use client";

import type { AssetListItem } from "@/lib/data";
import { TYPE_LABELS, TYPE_ICONS } from "@/lib/library";
import { gradientFor } from "@/lib/artifact-view";
import { initials } from "@/lib/colors";

export function AssetCard({
  asset,
  onOpen,
}: {
  asset: AssetListItem;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="card-lift group overflow-hidden rounded-card border border-line/70 bg-card text-left shadow-soft"
    >
      <div className="overflow-hidden">
        <div className="transition-transform duration-500 ease-premium group-hover:scale-[1.04]">
          <AssetPreview asset={asset} />
        </div>
      </div>
      <div className="p-3">
        <div className="truncate text-[12.5px] font-semibold">{asset.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate">
          <span
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-white"
            style={{ background: asset.person.avatarColor }}
          >
            {initials(asset.person.name)}
          </span>
          {asset.person.name}
          {asset.channels.slice(0, 2).map((c) => (
            <span key={c.id} className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold">
              {c.icon} {c.name}
            </span>
          ))}
          {asset.channels.length > 2 && (
            <span className="text-[10px]">+{asset.channels.length - 2}</span>
          )}
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${
              asset.source === "GENERATED"
                ? "bg-[#efe6fb] text-[#7a4fc9]"
                : "bg-[#e5f0fb] text-[#2a6fb8]"
            }`}
          >
            {asset.source === "GENERATED" ? "AI" : "Upload"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function AssetPreview({
  asset,
  className = "h-[122px]",
}: {
  asset: Pick<AssetListItem, "title" | "type" | "thumbnailUrl">;
  className?: string;
}) {
  if (asset.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.thumbnailUrl}
        alt={asset.title}
        className={`w-full object-cover ${className}`}
      />
    );
  }
  const [c1, c2] = gradientFor(asset.title);
  return (
    <div
      className={`grid w-full place-items-center px-3 text-center text-2xl ${className}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span>{TYPE_ICONS[asset.type] ?? "📄"}</span>
    </div>
  );
}
