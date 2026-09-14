"use client";

import { useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { mediaEntries } from "@/components/editor/editor-utils";
import { SidebarSearch } from "@/components/editor/left-sidebar/SidebarSearch";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import { cn } from "@/lib/utils";

type AssetFilter = "all" | "image" | "video";

export function AssetsPanel({
  config,
  dict,
  locale,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssetFilter>("all");
  const entries = useMemo(() => mediaEntries(config), [config]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(([id, item]) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (!q) return true;
      const alt = item.alt ?? "";
      return id.toLowerCase().includes(q) || alt.toLowerCase().includes(q);
    });
  }, [entries, filter, query]);

  const hasVideo = entries.some(([, item]) => item.type === "video");
  const hasImage = entries.some(([, item]) => item.type === "image");

  return (
    <div className="editor-left-panel-body">
      {!entries.length ? (
        <div className="editor-left-empty-state">
          <ImageIcon
            size={20}
            className="text-[color:var(--ed-subtle)]"
            aria-hidden
          />
          <p className="editor-left-empty-state__title">
            {dict.editor.assetsEmpty}
          </p>
          <p className="editor-left-empty-state__hint">
            {dict.editor.assetsEmptyHint}
          </p>
        </div>
      ) : (
        <>
          <SidebarSearch
            value={query}
            onChange={setQuery}
            placeholder={
              locale === "fa" ? "جستجوی رسانه…" : "Search media…"
            }
            label={locale === "fa" ? "جستجوی رسانه" : "Search media"}
          />

          {hasImage || hasVideo ? (
            <div
              className="editor-add-cats"
              role="toolbar"
              aria-label={dict.editor.assets}
            >
              <button
                type="button"
                data-active={filter === "all"}
                className="editor-add-cat"
                onClick={() => setFilter("all")}
              >
                {dict.editor.assetsFilterAll}
              </button>
              {hasImage ? (
                <button
                  type="button"
                  data-active={filter === "image"}
                  className="editor-add-cat"
                  onClick={() => setFilter("image")}
                >
                  {dict.editor.assetsFilterImages}
                </button>
              ) : null}
              {hasVideo ? (
                <button
                  type="button"
                  data-active={filter === "video"}
                  className="editor-add-cat"
                  onClick={() => setFilter("video")}
                >
                  {dict.editor.assetsFilterVideo}
                </button>
              ) : null}
            </div>
          ) : null}

          {!filtered.length ? (
            <p className="editor-left-empty">{dict.editor.noSectionsMatch}</p>
          ) : (
            <ul className="editor-assets-grid" role="list">
              {filtered.map(([id, item]) => (
                <li key={id}>
                  <figure
                    className={cn("editor-asset-tile")}
                    title={item.alt || id}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.alt || id}
                      loading="lazy"
                      decoding="async"
                      className="editor-asset-tile__img"
                    />
                    <figcaption className="editor-asset-tile__cap">
                      {item.alt || id}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
