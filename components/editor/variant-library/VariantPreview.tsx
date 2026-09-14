"use client";

import { useMemo, type ReactNode } from "react";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import { StoreRoot } from "@/components/store/StoreRoot";
import { StoreCartProvider } from "@/lib/store/cart";
import { SiteNavProvider } from "@/components/website/SiteNavContext";
import { EditorEditProvider } from "@/components/editor/EditContext";
import { renderRegisteredStoreSection } from "@/components/store/section-renderers";
import { getStoreCatalog, getStoreCategories } from "@/lib/store/catalog";
import { buildVariantPreviewConfig } from "@/lib/editor/apply-section-variant";
import { cn } from "@/lib/utils";

/**
 * Isolated preview of a real section variant renderer.
 * Never mutates editor config, history, or autosave.
 */
export function VariantPreview({
  config,
  sectionId,
  variantId,
  className,
}: {
  config: WebsiteConfig;
  sectionId: string;
  variantId: string;
  className?: string;
}) {
  const preview = useMemo(
    () => buildVariantPreviewConfig(config, sectionId, variantId),
    [config, sectionId, variantId],
  );

  if (!preview) {
    return (
      <div className={cn("ed-variant-preview ed-variant-preview--empty", className)}>
        <span>—</span>
      </div>
    );
  }

  return (
    <div
      className={cn("ed-variant-preview", className)}
      data-variant-preview={variantId}
      aria-hidden
      // Decorative thumbnail only — strip nested interactive chrome from a11y/focus.
      inert
    >
      <div className="ed-variant-preview__scaler">
        <PreviewProviders config={preview.config}>
          <PreviewSectionBody
            config={preview.config}
            sectionId={sectionId}
          />
        </PreviewProviders>
      </div>
    </div>
  );
}

function PreviewProviders({
  config,
  children,
}: {
  config: WebsiteConfig;
  children: ReactNode;
}) {
  return (
    <EditorEditProvider
      enabled={false}
      mode="preview"
      config={config}
      onChange={() => {
        /* preview is read-only — never persist */
      }}
      onSelect={() => {}}
      onSelectSection={() => {}}
      onHoverSection={() => {}}
    >
      <SiteNavProvider
        value={{
          basePath: "",
          onProductNavigate: () => {},
          onHomeNavigate: () => {},
        }}
      >
        <StoreCartProvider persist={false}>
          <StoreRoot config={config} className="ed-variant-preview__store">
            {children}
          </StoreRoot>
        </StoreCartProvider>
      </SiteNavProvider>
    </EditorEditProvider>
  );
}

function PreviewSectionBody({
  config,
  sectionId,
}: {
  config: WebsiteConfig;
  sectionId: string;
}) {
  const section = config.sections.find((s) => s.id === sectionId) as
    | SectionConfig
    | undefined;
  const catalog = useMemo(() => getStoreCatalog(config), [config]);
  const categories = useMemo(
    () => getStoreCategories(config, catalog),
    [config, catalog],
  );

  if (!section) return null;

  return (
    <div
      className="ed-variant-preview__stage"
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {renderRegisteredStoreSection({
        config,
        section,
        mode: "preview",
        catalog,
        categories,
        shopProducts: catalog,
        onQuickView: () => {},
      })}
    </div>
  );
}
