import { cn } from "@/lib/cn";

/**
 * Route-transition skeleton (used by the route-group loading.tsx files).
 * Every page is force-dynamic with server fetches, so without this the
 * previous page just freezes until the server responds.
 */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-4 pb-16 sm:px-8" aria-busy="true" aria-label="Loading">
      <div className="mb-6 h-8 w-52 rounded-full bg-card-warm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: blocks }).map((_, i) => (
          <div
            key={i}
            className={cn("h-40 rounded-card bg-card shadow-card", i === 0 && "sm:col-span-2 lg:col-span-1")}
          />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-card bg-card shadow-card" />
    </div>
  );
}
