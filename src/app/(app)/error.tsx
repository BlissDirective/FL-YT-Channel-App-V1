"use client";

import { RotateCcw } from "lucide-react";

/** Route error boundary — surfaces server failures instead of a blank
    screen, in the app's own voice. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md rounded-card bg-card p-6 text-center shadow-card">
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted">Ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02]"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}
