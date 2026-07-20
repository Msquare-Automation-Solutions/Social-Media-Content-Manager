"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Keeps server-rendered data (incl. the sidebar count badges in the app layout)
 * in sync. The App Router caches layouts across client navigations, so counts
 * would otherwise go stale after an action or on another page. This refreshes:
 *   - on every route change (so counts update when you navigate),
 *   - when the tab regains focus,
 *   - on a light interval while the tab is visible.
 */
export function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.refresh();
  }, [pathname, router]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
