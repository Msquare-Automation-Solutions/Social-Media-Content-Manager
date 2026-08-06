"use client";

import { useEffect } from "react";

/**
 * One poller per tab, shared by every component that needs to know "did anything
 * change?" — the sidebar counts, the page data, the notification bell.
 *
 * This replaced a Server-Sent Events stream. SSE gave ~2.5s latency but held a
 * serverless function open for the whole time a tab was on screen (two, in fact:
 * the bell opened its own), which on Vercel is billed as provisioned memory by
 * the hour and paused the deployment. A poll is a ~50ms invocation instead, and
 * subscribers are only woken when the revision actually changes — so nothing
 * re-renders while the workspace is idle.
 */
export type LiveState = { unread: number; topId: string | null; rev: string };

const INTERVAL = 20_000;

type Listener = (s: LiveState) => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | undefined;
let last: LiveState | null = null;
let inFlight = false;

async function poll() {
  // Don't spend anything on a tab nobody's looking at.
  if (inFlight || typeof document === "undefined" || document.visibilityState !== "visible") return;
  inFlight = true;
  try {
    const r = await fetch("/api/live", { cache: "no-store" });
    if (!r.ok) return;
    const s: LiveState = await r.json();
    const changed = !last || s.rev !== last.rev || s.unread !== last.unread || s.topId !== last.topId;
    const first = last === null;
    last = s;
    // On the very first poll there is nothing to catch up on: the page was just
    // server-rendered with this state.
    if (changed && !first) for (const fn of listeners) fn(s);
  } catch {
    // Offline or a transient hiccup — the next tick tries again.
  } finally {
    inFlight = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(poll, INTERVAL);
  const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  void poll();
}

/** Run `onChange` whenever the workspace revision or the caller's inbox changes. */
export function useLiveSignal(onChange: (s: LiveState) => void) {
  useEffect(() => {
    listeners.add(onChange);
    start();
    return () => {
      listeners.delete(onChange);
    };
  }, [onChange]);
}
