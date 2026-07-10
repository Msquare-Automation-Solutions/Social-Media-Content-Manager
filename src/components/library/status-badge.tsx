import { STATUS_LABELS, type AssetStatus } from "@/lib/enums";

const STYLES: Record<string, string> = {
  PENDING: "bg-[#fdeeda] text-[#b07514]",
  REWORK: "bg-[#fdecea] text-[#c23b2a]",
  APPROVED: "bg-teal-soft text-teal-dark",
  PUBLISHED: "bg-[#e7edfb] text-[#3454b4]",
};

const DOTS: Record<string, string> = {
  PENDING: "bg-[#e0a53a]",
  REWORK: "bg-[#c23b2a]",
  APPROVED: "bg-teal",
  PUBLISHED: "bg-[#3f63d0]",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const label = STATUS_LABELS[status as AssetStatus] ?? status;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        STYLES[status] ?? "bg-bg text-slate"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status] ?? "bg-slate"}`} />
      {label}
    </span>
  );
}
