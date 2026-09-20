/**
 * Layout, content, and media component blocks for the product-owned registry.
 */

import type { VisualBlockDefinition } from "@/lib/visual-editor/registry/types";
import { attr, escapeHtml } from "@/lib/visual-editor/registry/markup";
import { visualComponentId } from "@/lib/visual-editor/ids";

function el(
  tag: string,
  sectionId: string,
  role: string,
  pageId: string,
  blockId: string,
  style: string,
  inner = "",
  extra: Record<string, string | undefined> = {},
): string {
  const id = visualComponentId(sectionId, role);
  const attrs = [
    attr("data-component-id", id),
    attr("data-component-type", blockId),
    attr("data-page-id", pageId),
    ...Object.entries(extra).map(([k, v]) => attr(k, v)),
  ].join("");
  if (tag === "img" || tag === "hr") {
    return `<${tag}${attrs} style="${style}" />`;
  }
  return `<${tag}${attrs} style="${style}">${inner}</${tag}>`;
}

export const COMPONENT_BLOCKS: VisualBlockDefinition[] = [
  {
    id: "layout-container",
    label: { fa: "کانتینر", en: "Container" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["container", "wrapper"],
    icon: "box",
    canNest: true,
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "container",
        ctx.pageId,
        "layout-container",
        "max-width:var(--ve-container-default,1100px);margin:0 auto;padding:24px;min-height:80px;",
      ),
  },
  {
    id: "layout-columns",
    label: { fa: "ستون‌ها", en: "Columns" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["columns", "flex"],
    icon: "columns",
    canNest: true,
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "columns"))}${attr("data-component-type", "layout-columns")}${attr("data-page-id", ctx.pageId)} style="display:grid;grid-template-columns:1fr 1fr;gap:var(--ve-space-md,24px);padding:16px;">
  <div style="min-height:80px;padding:12px;background:var(--ve-color-muted,#f8f8f8);"></div>
  <div style="min-height:80px;padding:12px;background:var(--ve-color-muted,#f8f8f8);"></div>
</div>`,
  },
  {
    id: "layout-grid",
    label: { fa: "گرید", en: "Grid" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["grid"],
    icon: "grid-3x3",
    canNest: true,
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "grid"))}${attr("data-component-type", "layout-grid")}${attr("data-page-id", ctx.pageId)} style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--ve-space-sm,16px);padding:16px;">
  <div style="min-height:64px;background:var(--ve-color-muted,#f3f3f3);"></div>
  <div style="min-height:64px;background:var(--ve-color-muted,#f3f3f3);"></div>
  <div style="min-height:64px;background:var(--ve-color-muted,#f3f3f3);"></div>
</div>`,
  },
  {
    id: "layout-stack",
    label: { fa: "استک", en: "Stack" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["stack", "flex column"],
    icon: "rows",
    canNest: true,
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "stack",
        ctx.pageId,
        "layout-stack",
        "display:flex;flex-direction:column;gap:var(--ve-space-sm,16px);padding:16px;min-height:80px;",
      ),
  },
  {
    id: "layout-spacer",
    label: { fa: "فاصله", en: "Spacer" },
    category: "utility",
    libraryTab: "layout",
    keywords: ["spacer", "space"],
    icon: "move-vertical",
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "spacer",
        ctx.pageId,
        "layout-spacer",
        "height:var(--ve-space-lg,48px);width:100%;",
      ),
  },
  {
    id: "layout-divider",
    label: { fa: "جداکننده", en: "Divider" },
    category: "utility",
    libraryTab: "layout",
    keywords: ["divider", "hr"],
    icon: "minus",
    create: (ctx) =>
      el(
        "hr",
        ctx.sectionId,
        "divider",
        ctx.pageId,
        "layout-divider",
        "border:0;border-top:1px solid #e5e5e5;margin:24px 0;",
      ),
  },
  {
    id: "content-heading",
    label: { fa: "عنوان", en: "Heading" },
    category: "content",
    libraryTab: "components",
    keywords: ["heading", "h1", "h2", "title"],
    icon: "heading",
    create: (ctx) =>
      el(
        "h2",
        ctx.sectionId,
        "heading",
        ctx.pageId,
        "content-heading",
        "font-size:2rem;font-weight:600;line-height:1.2;margin:0;color:var(--ve-color-foreground,#111);",
        "Heading",
      ),
  },
  {
    id: "content-text",
    label: { fa: "متن", en: "Text" },
    category: "content",
    libraryTab: "components",
    keywords: ["text", "paragraph"],
    icon: "type",
    create: (ctx) =>
      el(
        "p",
        ctx.sectionId,
        "text",
        ctx.pageId,
        "content-text",
        "font-size:1rem;line-height:1.6;margin:0;color:var(--ve-color-foreground,#444);",
        "Edit this paragraph.",
      ),
  },
  {
    id: "content-button",
    label: { fa: "دکمه", en: "Button" },
    category: "content",
    libraryTab: "components",
    keywords: ["button", "cta", "link"],
    icon: "mouse-pointer-click",
    create: (ctx) => {
      const bg = ctx.colors?.primary || "#111";
      return el(
        "a",
        ctx.sectionId,
        "button",
        ctx.pageId,
        "content-button",
        `display:inline-block;padding:12px 22px;background:${bg};color:#fff;text-decoration:none;border-radius:var(--ve-radius-md,6px);font-weight:500;`,
        "Button",
        { href: "#" },
      );
    },
  },
  {
    id: "content-card",
    label: { fa: "کارت", en: "Card" },
    category: "content",
    libraryTab: "components",
    keywords: ["card"],
    icon: "square",
    canNest: true,
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "card"))}${attr("data-component-type", "content-card")}${attr("data-page-id", ctx.pageId)} style="padding:24px;border:1px solid #e8e8e8;border-radius:var(--ve-radius-lg,12px);background:#fff;">
  <h3 style="margin:0 0 8px;font-size:1.15rem;">Card title</h3>
  <p style="margin:0;color:#555;line-height:1.5;">Short supporting text for this card.</p>
</div>`,
  },
  {
    id: "media-image",
    label: { fa: "تصویر", en: "Image" },
    category: "media",
    libraryTab: "media",
    keywords: ["image", "img", "photo"],
    icon: "image",
    create: (ctx) =>
      `<img${attr("data-component-id", visualComponentId(ctx.sectionId, "image"))}${attr("data-component-type", "media-image")}${attr("data-page-id", ctx.pageId)} src="https://picsum.photos/seed/${escapeHtml(ctx.sectionId)}/800/500" alt="Image" style="display:block;width:100%;height:auto;border-radius:var(--ve-radius-md,8px);" />`,
  },
  {
    id: "media-video",
    label: { fa: "ویدیو", en: "Video" },
    category: "media",
    libraryTab: "media",
    keywords: ["video", "youtube"],
    icon: "video",
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "video"))}${attr("data-component-type", "media-video")}${attr("data-page-id", ctx.pageId)} style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#111;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen title="Video"></iframe>
</div>`,
  },
];
