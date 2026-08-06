"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLiveSignal } from "@/components/live-signal";

/**
 * Keeps server-rendered data — including the sidebar count badges in the app
 * layout — in sync when someone *else* changes something. The shared poller
 * reports a workspace revision every 20s and this refreshes only when it has
 * actually changed.
 *
 * Two things it deliberately does NOT do, both of which used to cost a full
 * server re-render of a force-dynamic page for no new information:
 *   - no interval refresh (that was what burnt Vercel's compute budget);
 *   - no refresh on route change. Navigating already refetches the page from the
 *     server; the extra refresh re-rendered the whole tree a second time, so
 *     every click cost two renders. Only the layout is preserved across a
 *     navigation, and the poller covers that within 20s — or immediately, since
 *     it re-checks the moment the tab regains focus.
 *
 * Actions taken by this user refresh explicitly at their call sites, so your own
 * changes still appear at once.
 */
export function LiveRefresh() {
  const router = useRouter();

  useLiveSignal(useCallback(() => router.refresh(), [router]));

  return null;
}
