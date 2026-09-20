"use client";

/**
 * Preview-only renderer for custom GrapesJS pages.
 * Does not make GrapesJS the publish schema — reserved pages still use WebsiteRenderer.
 */

import { useMemo } from "react";
import type { WebsiteConfig, WebsitePage } from "@/types/website";
import { extractProjectPageHtml } from "@/lib/visual-editor/pages";

export function VisualCustomPagePreview({
  config,
  page,
}: {
  config: WebsiteConfig;
  page: WebsitePage;
}) {
  const html = useMemo(
    () => extractProjectPageHtml(config.visualEditor?.project, page.id),
    [config.visualEditor?.project, page.id],
  );

  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";
  const lang = config.settings.language === "en" ? "en" : "fa";

  if (!html) {
    return (
      <main
        dir={dir}
        lang={lang}
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: 48,
          fontFamily: "system-ui,sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>{page.name}</h1>
          <p style={{ color: "#666", margin: 0 }}>
            {lang === "fa"
              ? "محتوای این صفحه هنوز در پیش‌نمایش در دسترس نیست. در ویرایشگر بصری ویرایش کنید."
              : "This page has no previewable content yet. Edit it in the Visual Editor."}
          </p>
        </div>
      </main>
    );
  }

  // Strip outer body tag if present for safe innerHTML mounting
  const inner = html
    .replace(/^[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "");

  return (
    <div
      dir={dir}
      lang={lang}
      data-preview-page={page.id}
      data-preview-slug={page.slug}
      // Custom page preview is a projection snapshot — not the publish renderer.
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
