"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PublishButton({
  websiteId,
  published,
  publishLabel,
  unpublishLabel,
}: {
  websiteId: string;
  published: boolean;
  publishLabel: string;
  unpublishLabel: string;
}) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant={published ? "outline" : "default"}
      onClick={async () => {
        await fetch(`/api/websites/${websiteId}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ published: !published }),
        });
        router.refresh();
      }}
    >
      {published ? unpublishLabel : publishLabel}
    </Button>
  );
}
