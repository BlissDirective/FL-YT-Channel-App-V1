import { Sparkles } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 pt-4">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-3xl bg-raised text-accent">
          <Sparkles className="size-7" fill="currentColor" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Faceless Studio</h1>
        <p className="text-center text-sm text-muted">
          Your autonomous channel control panel
        </p>
      </div>

      {isSupabaseConfigured() ? (
        <LoginForm next={next ?? "/"} />
      ) : (
        <div className="w-full rounded-card bg-card p-6 shadow-card">
          <p className="text-sm font-semibold">Supabase not configured</p>
          <p className="mt-2 text-sm text-muted">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> to the deployment
            environment variables, then redeploy. See docs/setup.md.
          </p>
        </div>
      )}
    </div>
  );
}
