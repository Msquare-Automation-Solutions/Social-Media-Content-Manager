"use client";

import { useRouter } from "next/navigation";

// "← Back", returns to the previous page (browser history), falling back to the
// chat home when there's no history to go back to (e.g. opened via direct link).
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push("/");
      }}
      className={`text-[13px] font-semibold text-teal-dark hover:underline ${className}`}
    >
      ← Back
    </button>
  );
}
