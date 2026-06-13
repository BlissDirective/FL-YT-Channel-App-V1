"use client";

import { useState, useTransition } from "react";
import { Loader2, Wifi } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { testCredentialAction, type TestResult } from "@/lib/actions/diagnostics";

export type ServiceRow = {
  key: string;
  label: string;
  phase: string;
  present: boolean;
  required: boolean;
  testable: boolean;
};

export function CredentialHealthList({ services }: { services: ServiceRow[] }) {
  return (
    <ul className="divide-y divide-line">
      {services.map((s) => (
        <ServiceItem key={s.key} service={s} />
      ))}
    </ul>
  );
}

function ServiceItem({ service: s }: { service: ServiceRow }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TestResult>();

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <span className={cn("size-2.5 rounded-full", s.present ? "bg-success" : "bg-muted/40")} />
        <div>
          <p className="text-sm font-medium">{s.label}</p>
          <p className="text-xs text-muted">
            Needed by Phase {s.phase}
            {result && (
              <>
                {" · "}
                <span className={result.ok ? "text-success" : "text-coral"}>
                  {result.detail}
                  {result.latencyMs != null && result.ok ? ` (${result.latencyMs}ms)` : ""}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {s.testable && s.present && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setResult(undefined);
                setResult(await testCredentialAction(s.key));
              })
            }
            className="flex items-center gap-1.5 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Wifi className="size-3.5" />}
            Test
          </button>
        )}
        {s.present ? (
          <StatusChip tone="success">Connected</StatusChip>
        ) : s.required ? (
          <StatusChip tone="coral">Missing</StatusChip>
        ) : (
          <StatusChip tone="neutral">Mock mode</StatusChip>
        )}
      </div>
    </li>
  );
}
