/**
 * Layout, content, media, and form component blocks for the product-owned registry.
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
  if (tag === "img" || tag === "hr" || tag === "input") {
    return `<${tag}${attrs} style="${style}" />`;
  }
  return `<${tag}${attrs} style="${style}">${inner}</${tag}>`;
}

const NESTABLE_LAYOUT_CHILDREN = [
  "layout-container",
  "layout-row",
  "layout-column",
  "layout-stack",
  "layout-grid",
  "layout-flex",
  "layout-spacer",
  "layout-divider",
  "content-heading",
  "content-text",
  "content-button",
  "content-card",
  "content-icon",
  "media-image",
  "media-video",
  "form-form",
  "form-input",
  "form-textarea",
  "form-select",
  "form-checkbox",
];

export const COMPONENT_BLOCKS: VisualBlockDefinition[] = [
  {
    id: "layout-container",
    label: { fa: "کانتینر", en: "Container" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["container", "wrapper"],
    icon: "box",
    canNest: true,
    resizable: true,
    nesting: { allowedChildren: NESTABLE_LAYOUT_CHILDREN },
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
    id: "layout-row",
    label: { fa: "ردیف", en: "Row" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["row", "horizontal"],
    icon: "rows",
    canNest: true,
    nesting: {
      allowedChildren: [
        "layout-column",
        "layout-container",
        "layout-stack",
        ...NESTABLE_LAYOUT_CHILDREN.filter((id) => id !== "layout-row"),
      ],
    },
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "row",
        ctx.pageId,
        "layout-row",
        "display:flex;flex-direction:row;flex-wrap:wrap;gap:var(--ve-space-md,24px);padding:12px;min-height:64px;width:100%;",
      ),
  },
  {
    id: "layout-column",
    label: { fa: "ستون", en: "Column" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["column", "col"],
    icon: "columns-2",
    canNest: true,
    nesting: {
      allowedParents: [
        "layout-row",
        "layout-columns",
        "layout-grid",
        "layout-flex",
        "layout-container",
        "layout-stack",
        "content-card",
      ],
      allowedChildren: NESTABLE_LAYOUT_CHILDREN.filter(
        (id) => id !== "layout-column",
      ),
    },
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "column",
        ctx.pageId,
        "layout-column",
        "flex:1 1 0;min-width:120px;min-height:64px;padding:12px;",
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
    nesting: {
      allowedChildren: ["layout-column", ...NESTABLE_LAYOUT_CHILDREN],
    },
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "columns"))}${attr("data-component-type", "layout-columns")}${attr("data-page-id", ctx.pageId)} style="display:grid;grid-template-columns:1fr 1fr;gap:var(--ve-space-md,24px);padding:16px;">
  <div${attr("data-component-id", visualComponentId(ctx.sectionId, "col-a"))}${attr("data-component-type", "layout-column")}${attr("data-page-id", ctx.pageId)} style="min-height:80px;padding:12px;background:var(--ve-color-muted,#f8f8f8);"></div>
  <div${attr("data-component-id", visualComponentId(ctx.sectionId, "col-b"))}${attr("data-component-type", "layout-column")}${attr("data-page-id", ctx.pageId)} style="min-height:80px;padding:12px;background:var(--ve-color-muted,#f8f8f8);"></div>
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
    nesting: { allowedChildren: NESTABLE_LAYOUT_CHILDREN },
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "grid",
        ctx.pageId,
        "layout-grid",
        "display:grid;grid-template-columns:repeat(3,1fr);gap:var(--ve-space-sm,16px);padding:16px;min-height:80px;",
      ),
  },
  {
    id: "layout-flex",
    label: { fa: "فلکس", en: "Flex" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["flex", "flexbox"],
    icon: "stretch-horizontal",
    canNest: true,
    nesting: { allowedChildren: NESTABLE_LAYOUT_CHILDREN },
    create: (ctx) =>
      el(
        "div",
        ctx.sectionId,
        "flex",
        ctx.pageId,
        "layout-flex",
        "display:flex;flex-wrap:wrap;align-items:center;gap:var(--ve-space-sm,16px);padding:16px;min-height:64px;",
      ),
  },
  {
    id: "layout-stack",
    label: { fa: "استک", en: "Stack" },
    category: "layout",
    libraryTab: "layout",
    keywords: ["stack", "flex column"],
    icon: "rows",
    canNest: true,
    nesting: { allowedChildren: NESTABLE_LAYOUT_CHILDREN },
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
    canNest: false,
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
    canNest: false,
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
    canNest: false,
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
    canNest: false,
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
    canNest: false,
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
    id: "content-icon",
    label: { fa: "آیکون", en: "Icon" },
    category: "content",
    libraryTab: "components",
    keywords: ["icon", "symbol"],
    icon: "sparkles",
    canNest: false,
    create: (ctx) =>
      el(
        "span",
        ctx.sectionId,
        "icon",
        ctx.pageId,
        "content-icon",
        "display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:999px;background:var(--ve-color-muted,#f3f3f3);font-size:1.25rem;",
        "★",
        { role: "img", "aria-label": "Icon" },
      ),
  },
  {
    id: "content-card",
    label: { fa: "کارت", en: "Card" },
    category: "content",
    libraryTab: "components",
    keywords: ["card"],
    icon: "square",
    canNest: true,
    nesting: { allowedChildren: NESTABLE_LAYOUT_CHILDREN },
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "card"))}${attr("data-component-type", "content-card")}${attr("data-page-id", ctx.pageId)} style="padding:24px;border:1px solid #e8e8e8;border-radius:var(--ve-radius-lg,12px);background:#fff;">
  <h3${attr("data-component-id", visualComponentId(ctx.sectionId, "card-title"))}${attr("data-component-type", "content-heading")} style="margin:0 0 8px;font-size:1.15rem;">Card title</h3>
  <p${attr("data-component-id", visualComponentId(ctx.sectionId, "card-body"))}${attr("data-component-type", "content-text")} style="margin:0;color:#555;line-height:1.5;">Short supporting text for this card.</p>
</div>`,
  },
  {
    id: "media-image",
    label: { fa: "تصویر", en: "Image" },
    category: "media",
    libraryTab: "media",
    keywords: ["image", "img", "photo"],
    icon: "image",
    canNest: false,
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
    canNest: false,
    create: (ctx) =>
      `<div${attr("data-component-id", visualComponentId(ctx.sectionId, "video"))}${attr("data-component-type", "media-video")}${attr("data-page-id", ctx.pageId)} style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#111;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen title="Video"></iframe>
</div>`,
  },
  {
    id: "form-form",
    label: { fa: "فرم", en: "Form" },
    category: "forms",
    libraryTab: "forms",
    keywords: ["form", "contact"],
    icon: "form-input",
    canNest: true,
    nesting: {
      allowedChildren: [
        "form-input",
        "form-textarea",
        "form-select",
        "form-checkbox",
        "content-heading",
        "content-text",
        "content-button",
        "layout-stack",
        "layout-spacer",
      ],
    },
    create: (ctx) =>
      `<form${attr("data-component-id", visualComponentId(ctx.sectionId, "form"))}${attr("data-component-type", "form-form")}${attr("data-page-id", ctx.pageId)} style="display:flex;flex-direction:column;gap:12px;padding:16px;max-width:480px;" onsubmit="return false;">
  <label style="display:grid;gap:4px;font-size:0.9rem;">Name
    <input${attr("data-component-id", visualComponentId(ctx.sectionId, "form-name"))}${attr("data-component-type", "form-input")} type="text" name="name" placeholder="Your name" style="padding:10px 12px;border:1px solid #ddd;border-radius:8px;" />
  </label>
  <label style="display:grid;gap:4px;font-size:0.9rem;">Message
    <textarea${attr("data-component-id", visualComponentId(ctx.sectionId, "form-message"))}${attr("data-component-type", "form-textarea")} name="message" rows="4" placeholder="Message" style="padding:10px 12px;border:1px solid #ddd;border-radius:8px;"></textarea>
  </label>
  <button${attr("data-component-id", visualComponentId(ctx.sectionId, "form-submit"))}${attr("data-component-type", "content-button")} type="submit" style="padding:12px 18px;background:#111;color:#fff;border:0;border-radius:8px;">Send</button>
</form>`,
  },
  {
    id: "form-input",
    label: { fa: "ورودی", en: "Input" },
    category: "forms",
    libraryTab: "forms",
    keywords: ["input", "field", "text field"],
    icon: "text-cursor-input",
    canNest: false,
    create: (ctx) =>
      el(
        "input",
        ctx.sectionId,
        "input",
        ctx.pageId,
        "form-input",
        "display:block;width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;",
        "",
        { type: "text", name: "field", placeholder: "Enter text", "aria-label": "Input" },
      ),
  },
  {
    id: "form-textarea",
    label: { fa: "متن بلند", en: "Textarea" },
    category: "forms",
    libraryTab: "forms",
    keywords: ["textarea", "multiline"],
    icon: "align-left",
    canNest: false,
    create: (ctx) =>
      el(
        "textarea",
        ctx.sectionId,
        "textarea",
        ctx.pageId,
        "form-textarea",
        "display:block;width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;min-height:96px;",
        "",
        { name: "message", rows: "4", placeholder: "Message", "aria-label": "Textarea" },
      ),
  },
  {
    id: "form-select",
    label: { fa: "انتخاب", en: "Select" },
    category: "forms",
    libraryTab: "forms",
    keywords: ["select", "dropdown"],
    icon: "list",
    canNest: false,
    create: (ctx) =>
      `<select${attr("data-component-id", visualComponentId(ctx.sectionId, "select"))}${attr("data-component-type", "form-select")}${attr("data-page-id", ctx.pageId)}${attr("aria-label", "Select")} style="display:block;width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;">
  <option value="">Choose…</option>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</select>`,
  },
  {
    id: "form-checkbox",
    label: { fa: "چک‌باکس", en: "Checkbox" },
    category: "forms",
    libraryTab: "forms",
    keywords: ["checkbox", "agree"],
    icon: "check-square",
    canNest: false,
    create: (ctx) =>
      `<label${attr("data-component-id", visualComponentId(ctx.sectionId, "checkbox"))}${attr("data-component-type", "form-checkbox")}${attr("data-page-id", ctx.pageId)} style="display:inline-flex;align-items:center;gap:8px;font-size:0.95rem;">
  <input type="checkbox" name="agree" />
  <span>I agree</span>
</label>`,
  },
  {
    id: "nav-navbar",
    label: { fa: "نوار ناوبری", en: "Navbar" },
    category: "navigation",
    libraryTab: "components",
    keywords: ["navbar", "nav", "menu"],
    icon: "menu",
    canNest: true,
    nesting: {
      allowedChildren: [
        "content-heading",
        "content-button",
        "content-text",
        "layout-flex",
        "media-image",
      ],
    },
    create: (ctx) =>
      `<nav${attr("data-component-id", visualComponentId(ctx.sectionId, "navbar"))}${attr("data-component-type", "nav-navbar")}${attr("data-page-id", ctx.pageId)}${attr("aria-label", "Primary")} style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;border-bottom:1px solid #eee;">
  <strong style="font-size:1.1rem;">Brand</strong>
  <div style="display:flex;gap:16px;align-items:center;">
    <a href="#" style="text-decoration:none;color:inherit;">Home</a>
    <a href="#" style="text-decoration:none;color:inherit;">About</a>
    <a href="#" style="text-decoration:none;color:inherit;">Contact</a>
  </div>
</nav>`,
  },
  {
    id: "nav-footer",
    label: { fa: "فوتر ساده", en: "Simple Footer" },
    category: "navigation",
    libraryTab: "components",
    keywords: ["footer", "bottom"],
    icon: "panel-bottom",
    canNest: true,
    nesting: {
      allowedChildren: [
        "content-heading",
        "content-text",
        "content-button",
        "layout-flex",
        "layout-stack",
      ],
    },
    create: (ctx) =>
      `<footer${attr("data-component-id", visualComponentId(ctx.sectionId, "simple-footer"))}${attr("data-component-type", "nav-footer")}${attr("data-page-id", ctx.pageId)} style="padding:32px 24px;background:#0f0f12;color:#aaa;text-align:center;">
  <p style="margin:0;font-size:0.9rem;">© Brand</p>
</footer>`,
  },
];
