"use client";

import type { WebsiteConfig } from "@/types/website";
import { mediaEntries } from "@/components/editor/editor-utils";
import { cn } from "@/lib/utils";

export function MediaPicker({
  config,
  value,
  multi = false,
  values = [],
  onPick,
  onClear,
  clearLabel,
  emptyLabel,
}: {
  config: WebsiteConfig;
  value?: string;
  multi?: boolean;
  values?: string[];
  onPick: (id: string) => void;
  onClear?: () => void;
  clearLabel: string;
  emptyLabel: string;
}) {
  const items = mediaEntries(config);
  if (!items.length) {
    return (
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12px] text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {items.map(([id, media]) => {
          const selected = multi ? values.includes(id) : value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg ring-1 ring-border transition",
                selected && "ring-2 ring-ink",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.alt || ""}
                className="size-full object-cover"
              />
            </button>
          );
        })}
      </div>
      {onClear && (multi ? values.length > 0 : Boolean(value)) ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
