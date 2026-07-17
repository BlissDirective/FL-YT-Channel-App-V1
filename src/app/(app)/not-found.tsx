import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Not found</h1>
      <p className="text-sm text-muted">
        That page or project doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card"
      >
        Back to overview
      </Link>
    </div>
  );
}
