"use client";

import { Puck, usePuck } from "@puckeditor/core";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import type { WebsiteConfig } from "@/types/website";
import { cn } from "@/lib/utils";

/** Canvas frame sized to the active device viewport + zoom. */
export function PuckCanvasFrame({
  zoom,
  config,
  locale,
  websiteId,
  activePage,
  productSlug,
  onProductNavigate,
  onHomeNavigate,
}: {
  zoom: number;
  config: WebsiteConfig;
  locale: string;
  websiteId: string;
  activePage: string;
  productSlug: string | null;
  onProductNavigate: (slug: string) => void;
  onHomeNavigate: () => void;
}) {
  const { appState } = usePuck();
  const width = appState.ui.viewports.current.width;
  const frameWidth = typeof width === "number" ? width : 1440;
  const showPagePreview = activePage !== "home";

  return (
    <div className="flex min-h-full justify-center">
      <div
        className={cn(
          "vitrin-editor-canvas origin-top overflow-hidden rounded-xl border border-zinc-700/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,.35)] transition-[width,transform]",
        )}
        style={{
          width: frameWidth,
          maxWidth: "100%",
          transform: `scale(${zoom})`,
        }}
      >
        {showPagePreview ? (
          <WebsiteRenderer
            config={config}
            mode="editor"
            basePath={`/${locale}/preview/${websiteId}`}
            productSlug={
              activePage === "product" ? (productSlug ?? undefined) : undefined
            }
            websiteId={websiteId}
            onProductNavigate={onProductNavigate}
            onHomeNavigate={onHomeNavigate}
          />
        ) : (
          <Puck.Preview />
        )}
      </div>
    </div>
  );
}
