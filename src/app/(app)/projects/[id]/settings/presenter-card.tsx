"use client";

/**
 * AI Avatar presenter (avatar build phase A): upload the ONE image that
 * plays the channel's presenter. Every avatar shot is generated from this
 * same image — that constancy is what keeps the character consistent
 * across clips. Works with realistic faces or stylized/cartoon characters
 * (often the safer choice for a faceless brand).
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { savePresenterImageAction } from "@/lib/actions/workspace";

export function PresenterCard({
  projectId,
  presenterUrl,
}: {
  projectId: string;
  presenterUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = (file: File) =>
    startTransition(async () => {
      setError(undefined);
      const fd = new FormData();
      fd.set("presenter", file);
      const r = await savePresenterImageAction(projectId, fd);
      if (!r.ok) setError(r.error ?? "Upload failed.");
      else router.refresh();
    });

  return (
    <Card>
      <CardTitle>Avatar presenter</CardTitle>
      <p className="mb-3 text-sm text-muted">
        One image plays your presenter in every avatar shot — same image, same
        character, every clip. In any video&apos;s workspace, say
        &ldquo;make beat 2 an avatar shot&rdquo; (or use the beat&apos;s Avatar
        button) and it lip-syncs that beat&apos;s voiceover.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-card-warm">
          {presenterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={presenterUrl} alt="Presenter" className="size-full object-cover" />
          ) : (
            <UserRound className="size-8 text-muted" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button variant="ghost" size="sm" disabled={isPending} onClick={() => fileRef.current?.click()}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {presenterUrl ? "Replace image" : "Upload presenter image"}
          </Button>
          <p className="text-xs text-muted">
            PNG/JPG/WEBP, up to 10 MB. Clear front-facing framing works best.
          </p>
          {error && <p className="text-xs font-medium text-coral">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
