"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveSignal } from "@/components/live-signal";

/**
 * Keeps server-rendered data (incl. the sidebar count badges in the app layout)
 * in sync. The App Router caches layouts across client navigations, so counts
 * would otherwise go stale after an action or on another page. This refreshes:
 *   - on every route change (so counts update when you navigate),
 *   - when the shared poller reports the workspace actually changed.
 *
 * Note there is deliberately no blind interval refresh: re-rendering a
 * force-dynamic page on a timer re-ran every query on the page whether or not
 * anything had changed, which is what burnt the compute budget.
 */
export function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.refresh();
  }, [pathname, router]);

  useLiveSignal(useCallback(() => router.refresh(), [router]));

  return null;
}
