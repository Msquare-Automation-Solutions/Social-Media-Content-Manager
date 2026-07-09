import { STATUS_LABELS, type AssetStatus } from "@/lib/enums";

const STYLES: Record<string, string> = {
  IN_QUEUE: "bg-[#fdeeda] text-[#b07514]",
  REWORK: "bg-[#fdecea] text-[#c23b2a]",
  APPROVED: "bg-teal-soft text-teal-dark",
};

const DOTS: Record<string, string> = {
  IN_QUEUE: "bg-[#e0a53a]",
  REWORK: "bg-[#c23b2a]",
  APPROVED: "bg-teal",
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
