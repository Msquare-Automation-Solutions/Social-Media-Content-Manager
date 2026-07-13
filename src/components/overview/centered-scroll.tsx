"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontal scroll container that centers its content on mount — so the
 * workspace-overview org chart opens with the centered "All platforms" root
 * (and its branch) in view, while still letting the user scroll sideways.
 */
export function CenteredScroll({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, []);
  return (
    <div ref={ref} className={`overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}
