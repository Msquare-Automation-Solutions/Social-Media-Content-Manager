import { initials } from "@/lib/colors";

// One avatar everywhere: shows the uploaded photo when present, else initials
// on the person's colour. `size` is the pixel diameter.
export function Avatar({
  name,
  color,
  url,
  size = 32,
  className = "",
}: {
  name: string;
  color?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, background: color ?? "#889", fontSize: Math.round(size * 0.4) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
    >
      {initials(name)}
    </span>
  );
}
