"use client";

/**
 * Product-owned inspector — Content / Layout / Spacing / Typography / Style / Responsive / Advanced.
 * Uses GrapesJS component APIs; does not bypass WebsiteConfig content-path sync.
 */

import { useEffect, useMemo, useState } from "react";
import type { Component, Editor } from "grapesjs";
import {
  getComponentStyle,
  relevantInspectorGroups,
  setComponentStyle,
  setSelectedText,
  type InspectorGroup,
} from "@/lib/visual-editor/inspector-model";
import { applySectionVariant, getVisualBlock } from "@/lib/visual-editor";
import type { VisualDeviceId } from "@/lib/visual-editor/devices";

const GROUP_LABELS: Record<
  InspectorGroup,
  { fa: string; en: string }
> = {
  content: { fa: "محتوا", en: "Content" },
  layout: { fa: "چیدمان", en: "Layout" },
  spacing: { fa: "فاصله", en: "Spacing" },
  typography: { fa: "تایپوگرافی", en: "Typography" },
  style: { fa: "استایل", en: "Style" },
  responsive: { fa: "ریسپانسیو", en: "Responsive" },
  advanced: { fa: "پیشرفته", en: "Advanced" },
};

export function VisualInspectorPanel({
  editor,
  isFa,
  device,
  onChange,
}: {
  editor: Editor | null;
  isFa: boolean;
  device: VisualDeviceId;
  onChange: () => void;
}) {
  const [selected, setSelected] = useState<Component | null>(null);
  const [group, setGroup] = useState<InspectorGroup>("layout");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const sel = editor.getSelected();
      setSelected(sel && !sel.is("wrapper") ? sel : null);
      setTick((t) => t + 1);
    };
    sync();
    editor.on("component:selected", sync);
    editor.on("component:deselected", sync);
    editor.on("component:update", sync);
    return () => {
      editor.off("component:selected", sync);
      editor.off("component:deselected", sync);
      editor.off("component:update", sync);
    };
  }, [editor]);

  const groups = useMemo(
    () => relevantInspectorGroups(selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces refresh on selection style changes
    [selected, tick],
  );

  useEffect(() => {
    if (!groups.includes(group)) {
      setGroup(groups[0] || "layout");
    }
  }, [groups, group]);

  if (!selected) {
    return (
      <p className="ve-assets-hint">
        {isFa
          ? "یک عنصر را در بوم انتخاب کنید."
          : "Select an element on the canvas."}
      </p>
    );
  }

  const attrs = selected.getAttributes?.() ?? {};
  const tag = String(selected.get("tagName") || "").toLowerCase();
  const apply = (prop: string, value: string) => {
    setComponentStyle(selected, prop, value);
    onChange();
    setTick((t) => t + 1);
  };

  return (
    <div className="ve-inspector-panel">
      <div className="ve-inspector-panel__meta">
        <strong>
          {attrs["data-section-type"] ||
            attrs["data-component-type"] ||
            tag ||
            "Element"}
        </strong>
        {attrs["data-component-id"] ? (
          <span className="ve-pages__slug">{attrs["data-component-id"]}</span>
        ) : null}
      </div>

      <div className="ve-library__tabs" role="tablist">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            className="ve-tab"
            data-active={group === g}
            aria-selected={group === g}
            onClick={() => setGroup(g)}
          >
            {isFa ? GROUP_LABELS[g].fa : GROUP_LABELS[g].en}
          </button>
        ))}
      </div>

      <div className="ve-inspector-panel__body" key={`${group}-${tick}`}>
        {group === "content" ? (
          <ContentFields
            component={selected}
            isFa={isFa}
            onChange={onChange}
            refresh={() => setTick((t) => t + 1)}
          />
        ) : null}
        {group === "layout" ? (
          <LayoutFields
            component={selected}
            apply={apply}
            isFa={isFa}
          />
        ) : null}
        {group === "spacing" ? (
          <SpacingFields component={selected} apply={apply} isFa={isFa} />
        ) : null}
        {group === "typography" ? (
          <TypographyFields component={selected} apply={apply} isFa={isFa} />
        ) : null}
        {group === "style" ? (
          <StyleFields component={selected} apply={apply} isFa={isFa} />
        ) : null}
        {group === "responsive" ? (
          <ResponsiveHint device={device} isFa={isFa} />
        ) : null}
        {group === "advanced" ? (
          <AdvancedFields
            editor={editor}
            component={selected}
            isFa={isFa}
            onChange={onChange}
          />
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ve-pages__label" style={{ display: "grid", gap: 4 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ContentFields({
  component,
  isFa,
  onChange,
  refresh,
}: {
  component: Component;
  isFa: boolean;
  onChange: () => void;
  refresh: () => void;
}) {
  const attrs = component.getAttributes?.() ?? {};
  const tag = String(component.get("tagName") || "").toLowerCase();
  const isImage = tag === "img" || component.get("type") === "image";
  const text =
    component.get("content") ||
    (typeof component.view?.el?.textContent === "string"
      ? component.view.el.textContent
      : "");

  if (isImage) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <Field label="Alt">
          <input
            className="ve-pages__input"
            defaultValue={attrs.alt || ""}
            onBlur={(e) => {
              component.addAttributes({ alt: e.target.value });
              onChange();
              refresh();
            }}
          />
        </Field>
        <Field label="Src">
          <input
            className="ve-pages__input"
            defaultValue={attrs.src || ""}
            onBlur={(e) => {
              component.addAttributes({ src: e.target.value });
              onChange();
              refresh();
            }}
          />
        </Field>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label={isFa ? "متن" : "Text"}>
        <textarea
          className="ve-pages__input"
          rows={3}
          defaultValue={String(text || "")}
          onBlur={(e) => {
            setSelectedText(component, e.target.value);
            onChange();
            refresh();
          }}
        />
      </Field>
      {tag === "a" || attrs.href !== undefined ? (
        <Field label={isFa ? "لینک" : "Link"}>
          <input
            className="ve-pages__input"
            defaultValue={attrs.href || ""}
            onBlur={(e) => {
              component.addAttributes({ href: e.target.value });
              onChange();
              refresh();
            }}
          />
        </Field>
      ) : null}
      {["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) ? (
        <Field label={isFa ? "سطح عنوان" : "Heading level"}>
          <select
            className="ve-pages__input"
            defaultValue={tag}
            onChange={(e) => {
              component.set("tagName", e.target.value);
              onChange();
              refresh();
            }}
          >
            {["h1", "h2", "h3", "h4", "h5", "h6"].map((h) => (
              <option key={h} value={h}>
                {h.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <label className="ve-pages__label" style={{ display: "flex", gap: 8 }}>
        <input
          type="checkbox"
          defaultChecked={attrs["data-visible"] !== "false"}
          onChange={(e) => {
            component.addAttributes({
              "data-visible": e.target.checked ? "true" : "false",
            });
            setComponentStyle(
              component,
              "display",
              e.target.checked ? "" : "none",
            );
            onChange();
            refresh();
          }}
        />
        {isFa ? "نمایش" : "Visible"}
      </label>
    </div>
  );
}

function LayoutFields({
  component,
  apply,
  isFa,
}: {
  component: Component;
  apply: (prop: string, value: string) => void;
  isFa: boolean;
}) {
  const g = (p: string) => getComponentStyle(component, p);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label={isFa ? "عرض" : "Width"}>
        <input
          className="ve-pages__input"
          defaultValue={g("width")}
          onBlur={(e) => apply("width", e.target.value)}
          placeholder="auto / 100% / 320px"
        />
      </Field>
      <Field label={isFa ? "حداقل عرض" : "Min width"}>
        <input
          className="ve-pages__input"
          defaultValue={g("min-width")}
          onBlur={(e) => apply("min-width", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "حداکثر عرض" : "Max width"}>
        <input
          className="ve-pages__input"
          defaultValue={g("max-width")}
          onBlur={(e) => apply("max-width", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "ارتفاع" : "Height"}>
        <input
          className="ve-pages__input"
          defaultValue={g("height")}
          onBlur={(e) => apply("height", e.target.value)}
        />
      </Field>
      <Field label="Display">
        <select
          className="ve-pages__input"
          defaultValue={g("display") || "block"}
          onChange={(e) => apply("display", e.target.value)}
        >
          {["block", "flex", "grid", "inline-flex", "inline-block", "none"].map(
            (v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ),
          )}
        </select>
      </Field>
      <Field label="Flex direction">
        <select
          className="ve-pages__input"
          defaultValue={g("flex-direction") || "row"}
          onChange={(e) => apply("flex-direction", e.target.value)}
        >
          {["row", "column", "row-reverse", "column-reverse"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Justify">
        <select
          className="ve-pages__input"
          defaultValue={g("justify-content") || "flex-start"}
          onChange={(e) => apply("justify-content", e.target.value)}
        >
          {[
            "flex-start",
            "center",
            "flex-end",
            "space-between",
            "space-around",
          ].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Align">
        <select
          className="ve-pages__input"
          defaultValue={g("align-items") || "stretch"}
          onChange={(e) => apply("align-items", e.target.value)}
        >
          {["stretch", "flex-start", "center", "flex-end", "baseline"].map(
            (v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ),
          )}
        </select>
      </Field>
      <Field label="Gap">
        <input
          className="ve-pages__input"
          defaultValue={g("gap")}
          onBlur={(e) => apply("gap", e.target.value)}
          placeholder="16px"
        />
      </Field>
      <Field label="Position">
        <select
          className="ve-pages__input"
          defaultValue={g("position") || "static"}
          onChange={(e) => apply("position", e.target.value)}
        >
          {["static", "relative", "absolute", "sticky"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Grid columns">
        <input
          className="ve-pages__input"
          defaultValue={g("grid-template-columns")}
          onBlur={(e) => apply("grid-template-columns", e.target.value)}
          placeholder="1fr 1fr"
        />
      </Field>
    </div>
  );
}

function SpacingFields({
  component,
  apply,
  isFa,
}: {
  component: Component;
  apply: (prop: string, value: string) => void;
  isFa: boolean;
}) {
  const g = (p: string) => getComponentStyle(component, p);
  const side = (
    prefix: "margin" | "padding",
    sideName: "top" | "right" | "bottom" | "left",
  ) => (
    <input
      className="ve-pages__input"
      style={{ width: "100%" }}
      defaultValue={g(`${prefix}-${sideName}`)}
      onBlur={(e) => apply(`${prefix}-${sideName}`, e.target.value)}
      aria-label={`${prefix} ${sideName}`}
      placeholder="0"
    />
  );

  return (
    <div className="ve-box-model" aria-label="Box model">
      <div className="ve-box-model__margin">
        <span className="ve-box-model__label">
          {isFa ? "مارجین" : "Margin"}
        </span>
        <div className="ve-box-model__row">{side("margin", "top")}</div>
        <div className="ve-box-model__mid">
          {side("margin", "left")}
          <div className="ve-box-model__padding">
            <span className="ve-box-model__label">
              {isFa ? "پدینگ" : "Padding"}
            </span>
            <div className="ve-box-model__row">{side("padding", "top")}</div>
            <div className="ve-box-model__mid">
              {side("padding", "left")}
              <div className="ve-box-model__content">
                {isFa ? "محتوا" : "Content"}
              </div>
              {side("padding", "right")}
            </div>
            <div className="ve-box-model__row">{side("padding", "bottom")}</div>
          </div>
          {side("margin", "right")}
        </div>
        <div className="ve-box-model__row">{side("margin", "bottom")}</div>
      </div>
    </div>
  );
}

function TypographyFields({
  component,
  apply,
  isFa,
}: {
  component: Component;
  apply: (prop: string, value: string) => void;
  isFa: boolean;
}) {
  const g = (p: string) => getComponentStyle(component, p);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label={isFa ? "اندازه فونت" : "Font size"}>
        <input
          className="ve-pages__input"
          defaultValue={g("font-size")}
          onBlur={(e) => apply("font-size", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "وزن" : "Weight"}>
        <select
          className="ve-pages__input"
          defaultValue={g("font-weight") || "400"}
          onChange={(e) => apply("font-weight", e.target.value)}
        >
          {["300", "400", "500", "600", "700"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={isFa ? "تراز" : "Align"}>
        <select
          className="ve-pages__input"
          defaultValue={g("text-align") || "start"}
          onChange={(e) => apply("text-align", e.target.value)}
        >
          {["start", "center", "end", "justify"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={isFa ? "ارتفاع خط" : "Line height"}>
        <input
          className="ve-pages__input"
          defaultValue={g("line-height")}
          onBlur={(e) => apply("line-height", e.target.value)}
        />
      </Field>
    </div>
  );
}

function StyleFields({
  component,
  apply,
  isFa,
}: {
  component: Component;
  apply: (prop: string, value: string) => void;
  isFa: boolean;
}) {
  const g = (p: string) => getComponentStyle(component, p);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label={isFa ? "رنگ متن" : "Color"}>
        <input
          className="ve-pages__input"
          type="color"
          defaultValue={normalizeColor(g("color"))}
          onChange={(e) => apply("color", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "پس‌زمینه" : "Background"}>
        <input
          className="ve-pages__input"
          type="color"
          defaultValue={normalizeColor(g("background-color") || "#ffffff")}
          onChange={(e) => apply("background-color", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "گردی گوشه" : "Radius"}>
        <input
          className="ve-pages__input"
          defaultValue={g("border-radius")}
          onBlur={(e) => apply("border-radius", e.target.value)}
          placeholder="var(--ve-radius-md)"
        />
      </Field>
      <Field label="Opacity">
        <input
          className="ve-pages__input"
          defaultValue={g("opacity")}
          onBlur={(e) => apply("opacity", e.target.value)}
          placeholder="1"
        />
      </Field>
    </div>
  );
}

function ResponsiveHint({
  device,
  isFa,
}: {
  device: VisualDeviceId;
  isFa: boolean;
}) {
  return (
    <div className="ve-assets-hint" style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0 }}>
        {isFa ? "دستگاه فعال:" : "Active device:"}{" "}
        <strong>{device}</strong>
      </p>
      <p style={{ margin: 0 }}>
        {isFa
          ? "تغییرات استایل روی دستگاه فعال اعمال می‌شوند. دسکتاپ / تبلت / موبایل مستقل می‌مانند."
          : "Style edits apply to the active device. Desktop / Tablet / Mobile stay independent via GrapesJS media rules."}
      </p>
    </div>
  );
}

function AdvancedFields({
  editor,
  component,
  isFa,
  onChange,
}: {
  editor: Editor | null;
  component: Component;
  isFa: boolean;
  onChange: () => void;
}) {
  const attrs = component.getAttributes?.() ?? {};
  const sectionType = attrs["data-section-type"];
  const blockId = sectionType ? `section-${sectionType}` : "";
  const variants = blockId ? getVisualBlock(blockId)?.variants ?? [] : [];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Field label="Section ID">
        <input
          className="ve-pages__input"
          readOnly
          value={attrs["data-section-id"] || ""}
        />
      </Field>
      {variants.length > 0 ? (
        <Field label={isFa ? "واریانت" : "Variant"}>
          <select
            className="ve-pages__input"
            defaultValue={attrs["data-section-variant"] || variants[0].id}
            onChange={(e) => {
              if (!editor) return;
              applySectionVariant(editor, e.target.value);
              onChange();
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {isFa ? v.label.fa : v.label.en}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Content path">
        <input
          className="ve-pages__input"
          readOnly
          value={attrs["data-content-path"] || "—"}
        />
      </Field>
    </div>
  );
}

function normalizeColor(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#111111";
}
