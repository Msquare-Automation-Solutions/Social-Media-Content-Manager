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

    // Real-time: the SSE stream emits a workspace revision whenever anyone acts
    // (approve, submit, publish, edit…). Refresh immediately so every user's
    // panels stay in sync without waiting for the interval. Skip the very first
    // (initial-state) message to avoid a redundant refresh on connect.
    let primed = false;
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = () => {
      if (!primed) { primed = true; return; }
      if (document.visibilityState === "visible") router.refresh();
    };

    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      es.close();
    };
  }, [router]);

  return null;
}
