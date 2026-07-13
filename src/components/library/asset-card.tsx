"use client";

import type { AssetListItem } from "@/lib/data";
import { TYPE_ICON_NAMES, TYPE_LABELS } from "@/lib/library";
import { Icon } from "@/components/ui/icons";
import { gradientFor } from "@/lib/artifact-view";
import { initials } from "@/lib/colors";
import { StatusBadge } from "@/components/library/status-badge";
import { PlatformIcon } from "@/components/ui/platform-icon";

export function AssetCard({
  asset,
  onOpen,
  selected = false,
  selecting = false,
  onToggleSelect,
}: {
  asset: AssetListItem;
  onOpen: () => void;
  selected?: boolean;
  selecting?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={`card-lift group relative cursor-pointer overflow-hidden rounded-card border bg-card text-left shadow-soft ${
        selected ? "border-teal ring-2 ring-teal/40" : "border-line/70"
      }`}
    >
      {onToggleSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(e);
          }}
          aria-label={selected ? "Deselect" : "Select"}
          className={`absolute right-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-[7px] border text-white shadow-soft transition ${
            selected
              ? "border-teal bg-teal"
              : `border-white/80 bg-black/25 ${selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`
          }`}
        >
          {selected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>
      )}
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-500 ease-premium group-hover:scale-[1.04]">
          <AssetPreview asset={asset} />
        </div>
        {/* Platform brand-logo badges (top-left overlay). */}
        {asset.channels.length > 0 && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
            {asset.channels.slice(0, 3).map((c) => (
              <span
                key={c.id}
                title={c.name}
                className="grid h-6 w-6 place-items-center rounded-full bg-white shadow-soft"
              >
                <PlatformIcon name={c.name} icon={c.icon} size={15} />
              </span>
            ))}
            {asset.channels.length > 3 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-[#5f6e81] shadow-soft">
                +{asset.channels.length - 3}
              </span>
            )}
          </div>
        )}
        {/* Content-type label pill (bottom-left overlay, white chip). */}
        <span className="absolute bottom-2 left-2 z-10 rounded-[8px] bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-[#141f2e] shadow-soft backdrop-blur-sm">
          {TYPE_LABELS[asset.type] ?? asset.type}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 truncate text-[12.5px] font-semibold">{asset.title}</div>
          {asset.monthSchedule ? (
            // Scheduled-this-month list: show the platform + date that puts this
            // asset in the month (it may be scheduled elsewhere in other months).
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-semibold text-teal-dark"
              title={
                `${asset.monthSchedule.name} · ${new Date(asset.monthSchedule.date).toLocaleDateString()}` +
                (asset.monthSchedule.extra > 0 ? ` (+${asset.monthSchedule.extra} more this month)` : "")
              }
            >
              <PlatformIcon name={asset.monthSchedule.name} icon={asset.monthSchedule.icon} size={11} />
              {new Date(asset.monthSchedule.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              {asset.monthSchedule.extra > 0 && (
                <span className="text-teal-dark/70">+{asset.monthSchedule.extra}</span>
              )}
            </span>
          ) : (
            asset.nextPostDate && (
              <span
                className="shrink-0 rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-semibold text-teal-dark"
                title={`Post date: ${new Date(asset.nextPostDate).toLocaleDateString()}`}
              >
                📅{" "}
                {new Date(asset.nextPostDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate">
          <span
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-white"
            style={{ background: asset.person.avatarColor }}
          >
            {initials(asset.person.name)}
          </span>
          <span className="truncate">{asset.person.name}</span>
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${
              asset.source === "GENERATED"
                ? "bg-[#efe6fb] text-[#7a4fc9]"
                : asset.source === "LINK"
                  ? "bg-[#fdeeda] text-[#b07514]"
                  : "bg-[#e5f0fb] text-[#2a6fb8]"
            }`}
          >
            {asset.source === "GENERATED" ? "AI" : asset.source === "LINK" ? "Link" : "Upload"}
          </span>
        </div>
        {/* Status pill below the meta row (reference-style). */}
        <div className="mt-2">
          <StatusBadge status={asset.status} />
        </div>
      </div>
    </div>
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
      className={`grid w-full place-items-center px-3 text-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <Icon name={TYPE_ICON_NAMES[asset.type] ?? "other"} size={30} className="text-white/95" />
    </div>
  );
}
