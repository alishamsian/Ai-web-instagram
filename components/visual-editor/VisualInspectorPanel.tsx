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
import {
  readVisibilityMap,
  setDeviceVisibility,
} from "@/lib/visual-editor/responsive-visibility";
import {
  clearStyleOverride,
  resolveStyleProp,
  setStyleOverride,
} from "@/lib/visual-editor/responsive-style";
import type { VisualDeviceId } from "@/lib/visual-editor/devices";

const GROUP_LABELS: Record<
  InspectorGroup,
  { fa: string; en: string }
> = {
  content: { fa: "محتوا", en: "Content" },
  layout: { fa: "چیدمان", en: "Layout" },
  spacing: { fa: "فاصله", en: "Spacing" },
  typography: { fa: "تایپوگرافی", en: "Typography" },
  background: { fa: "پس‌زمینه", en: "Background" },
  border: { fa: "حاشیه", en: "Border" },
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
        {group === "background" ? (
          <BackgroundFields component={selected} apply={apply} isFa={isFa} />
        ) : null}
        {group === "border" ? (
          <BorderFields component={selected} apply={apply} isFa={isFa} />
        ) : null}
        {group === "responsive" ? (
          <ResponsiveFields
            editor={editor}
            component={selected}
            device={device}
            isFa={isFa}
            onChange={onChange}
            refresh={() => setTick((t) => t + 1)}
          />
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
      {tag === "a" || attrs["data-component-type"] === "content-button" ? (
        <Field label={isFa ? "هدف" : "Target"}>
          <select
            className="ve-pages__input"
            defaultValue={attrs.target || "_self"}
            onChange={(e) => {
              component.addAttributes({ target: e.target.value });
              onChange();
              refresh();
            }}
          >
            <option value="_self">{isFa ? "همان صفحه" : "Same tab"}</option>
            <option value="_blank">{isFa ? "تب جدید" : "New tab"}</option>
          </select>
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
      <Field label="Grid columns">
        <input
          className="ve-pages__input"
          defaultValue={g("grid-template-columns")}
          onBlur={(e) => apply("grid-template-columns", e.target.value)}
          placeholder="1fr 1fr"
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
      <Field label="z-index">
        <input
          className="ve-pages__input"
          defaultValue={g("z-index")}
          onBlur={(e) => apply("z-index", e.target.value)}
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
  const [linkedPadding, setLinkedPadding] = useState(true);
  const [linkedMargin, setLinkedMargin] = useState(true);

  const applyLinked = (
    prefix: "margin" | "padding",
    linked: boolean,
    sideName: "top" | "right" | "bottom" | "left",
    value: string,
  ) => {
    if (linked) {
      apply(`${prefix}-top`, value);
      apply(`${prefix}-right`, value);
      apply(`${prefix}-bottom`, value);
      apply(`${prefix}-left`, value);
      apply(prefix, value);
      return;
    }
    apply(`${prefix}-${sideName}`, value);
  };

  const side = (
    prefix: "margin" | "padding",
    sideName: "top" | "right" | "bottom" | "left",
    linked: boolean,
  ) => (
    <input
      className="ve-pages__input"
      style={{ width: "100%" }}
      defaultValue={g(`${prefix}-${sideName}`) || g(prefix)}
      onBlur={(e) => applyLinked(prefix, linked, sideName, e.target.value)}
      aria-label={`${prefix} ${sideName}`}
      placeholder="0"
    />
  );

  return (
    <div className="ve-box-model" aria-label="Box model">
      <div className="ve-box-model__toolbar">
        <label className="ve-pages__label" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={linkedMargin}
            onChange={(e) => setLinkedMargin(e.target.checked)}
          />
          {isFa ? "مارجین یکسان" : "Link margins"}
        </label>
        <label className="ve-pages__label" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={linkedPadding}
            onChange={(e) => setLinkedPadding(e.target.checked)}
          />
          {isFa ? "پدینگ یکسان" : "Link paddings"}
        </label>
      </div>
      <div className="ve-box-model__margin">
        <span className="ve-box-model__label">
          {isFa ? "مارجین" : "Margin"}
        </span>
        <div className="ve-box-model__row">{side("margin", "top", linkedMargin)}</div>
        <div className="ve-box-model__mid">
          {side("margin", "left", linkedMargin)}
          <div className="ve-box-model__padding">
            <span className="ve-box-model__label">
              {isFa ? "پدینگ" : "Padding"}
            </span>
            <div className="ve-box-model__row">
              {side("padding", "top", linkedPadding)}
            </div>
            <div className="ve-box-model__mid">
              {side("padding", "left", linkedPadding)}
              <div className="ve-box-model__content">
                {isFa ? "محتوا" : "Content"}
              </div>
              {side("padding", "right", linkedPadding)}
            </div>
            <div className="ve-box-model__row">
              {side("padding", "bottom", linkedPadding)}
            </div>
          </div>
          {side("margin", "right", linkedMargin)}
        </div>
        <div className="ve-box-model__row">
          {side("margin", "bottom", linkedMargin)}
        </div>
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
      <Field label={isFa ? "توکن رنگ متن" : "Text color token"}>
        <select
          className="ve-pages__input"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) apply("color", e.target.value);
          }}
        >
          <option value="">{isFa ? "سفارشی / توکن…" : "Custom / token…"}</option>
          <option value="var(--ve-color-foreground)">foreground</option>
          <option value="var(--ve-color-primary)">primary</option>
          <option value="var(--ve-color-accent)">accent</option>
          <option value="var(--ve-color-muted)">muted</option>
        </select>
      </Field>
      <Field label={isFa ? "پس‌زمینه" : "Background"}>
        <input
          className="ve-pages__input"
          type="color"
          defaultValue={normalizeColor(g("background-color") || "#ffffff")}
          onChange={(e) => apply("background-color", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "توکن پس‌زمینه" : "Background token"}>
        <select
          className="ve-pages__input"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) apply("background-color", e.target.value);
          }}
        >
          <option value="">{isFa ? "سفارشی / توکن…" : "Custom / token…"}</option>
          <option value="var(--ve-color-background)">background</option>
          <option value="var(--ve-color-muted)">muted</option>
          <option value="var(--ve-color-primary)">primary</option>
        </select>
      </Field>
      <Field label={isFa ? "گردی گوشه" : "Radius"}>
        <select
          className="ve-pages__input"
          defaultValue={g("border-radius") || ""}
          onChange={(e) => apply("border-radius", e.target.value)}
        >
          <option value="">{isFa ? "سفارشی" : "Custom"}</option>
          <option value="var(--ve-radius-sm)">radius.sm</option>
          <option value="var(--ve-radius-md)">radius.md</option>
          <option value="var(--ve-radius-lg)">radius.lg</option>
          <option value="var(--ve-radius-full)">radius.full</option>
        </select>
      </Field>
      <Field label="Opacity">
        <input
          className="ve-pages__input"
          defaultValue={g("opacity")}
          onBlur={(e) => apply("opacity", e.target.value)}
          placeholder="1"
        />
      </Field>
      <Field label={isFa ? "سایه" : "Shadow"}>
        <select
          className="ve-pages__input"
          defaultValue={g("box-shadow") || ""}
          onChange={(e) => apply("box-shadow", e.target.value)}
        >
          <option value="">{isFa ? "بدون سایه" : "None"}</option>
          <option value="var(--ve-shadow-sm)">shadow.sm</option>
          <option value="var(--ve-shadow-md)">shadow.md</option>
          <option value="0 1px 2px rgba(0,0,0,.08)">subtle</option>
          <option value="0 8px 24px rgba(0,0,0,.12)">elevated</option>
        </select>
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
        {isFa ? "در حال ویرایش:" : "Editing"}{" "}
        <strong className="ve-device-badge">{device}</strong>
      </p>
      <p style={{ margin: 0 }}>
        {isFa
          ? "موبایل از تبلت، تبلت از دسکتاپ ارث می‌برد مگر اینکه override شود."
          : "Mobile inherits tablet, tablet inherits desktop, unless overridden."}
      </p>
    </div>
  );
}

function ResponsiveFields({
  editor,
  component,
  device,
  isFa,
  onChange,
  refresh,
}: {
  editor: Editor | null;
  component: Component;
  device: VisualDeviceId;
  isFa: boolean;
  onChange: () => void;
  refresh: () => void;
}) {
  const map = readVisibilityMap(component);
  const devices: VisualDeviceId[] = ["desktop", "tablet", "mobile"];
  const fontResolved = resolveStyleProp(component, "font-size", device);
  const padResolved = resolveStyleProp(component, "padding", device);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ResponsiveHint device={device} isFa={isFa} />
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 12, marginBottom: 8 }}>
          {isFa ? "نمایش در دستگاه" : "Visibility per device"}
        </legend>
        <div style={{ display: "grid", gap: 8 }}>
          {devices.map((d) => (
            <label
              key={d}
              className="ve-pages__label"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>
                {d}
                {d === device ? (
                  <span
                    className="ve-device-badge"
                    style={{ marginInlineStart: 6 }}
                  >
                    {isFa ? "فعال" : "active"}
                  </span>
                ) : null}
              </span>
              <select
                className="ve-pages__input"
                style={{ width: 120 }}
                value={map[d] ? "visible" : "hidden"}
                onChange={(e) => {
                  if (!editor) return;
                  setDeviceVisibility(
                    editor,
                    component,
                    d,
                    e.target.value === "visible",
                  );
                  onChange();
                  refresh();
                }}
              >
                <option value="visible">
                  {isFa ? "نمایش" : "Visible"}
                </option>
                <option value="hidden">{isFa ? "مخفی" : "Hidden"}</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 12, marginBottom: 8 }}>
          {isFa ? "استایل ریسپانسیو" : "Responsive style"}
        </legend>
        <div style={{ display: "grid", gap: 10 }}>
          <Field
            label={`${isFa ? "اندازه فونت" : "Font size"}${
              fontResolved.inherited
                ? ` (${isFa ? "ارثی از" : "from"} ${fontResolved.source})`
                : ""
            }`}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="ve-pages__input"
                key={`fs-${device}-${fontResolved.value}`}
                defaultValue={fontResolved.value}
                placeholder={fontResolved.value || "16px"}
                onBlur={(e) => {
                  if (!editor) return;
                  setStyleOverride(
                    editor,
                    component,
                    "font-size",
                    device,
                    e.target.value,
                  );
                  onChange();
                  refresh();
                }}
              />
              {device !== "desktop" ? (
                <button
                  type="button"
                  className="ve-btn"
                  onClick={() => {
                    if (!editor) return;
                    clearStyleOverride(editor, component, "font-size", device);
                    onChange();
                    refresh();
                  }}
                >
                  {isFa ? "بازنشانی" : "Reset"}
                </button>
              ) : null}
            </div>
          </Field>
          <Field
            label={`${isFa ? "پدینگ" : "Padding"}${
              padResolved.inherited
                ? ` (${isFa ? "ارثی از" : "from"} ${padResolved.source})`
                : ""
            }`}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="ve-pages__input"
                key={`pad-${device}-${padResolved.value}`}
                defaultValue={padResolved.value}
                placeholder="24px"
                onBlur={(e) => {
                  if (!editor) return;
                  setStyleOverride(
                    editor,
                    component,
                    "padding",
                    device,
                    e.target.value,
                  );
                  onChange();
                  refresh();
                }}
              />
              {device !== "desktop" ? (
                <button
                  type="button"
                  className="ve-btn"
                  onClick={() => {
                    if (!editor) return;
                    clearStyleOverride(editor, component, "padding", device);
                    onChange();
                    refresh();
                  }}
                >
                  {isFa ? "بازنشانی" : "Reset"}
                </button>
              ) : null}
            </div>
          </Field>
        </div>
      </fieldset>
    </div>
  );
}

function BackgroundFields({
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
      <Field label={isFa ? "رنگ پس‌زمینه" : "Background color"}>
        <input
          className="ve-pages__input"
          type="color"
          defaultValue={normalizeColor(g("background-color") || "#ffffff")}
          onChange={(e) => apply("background-color", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "تصویر پس‌زمینه" : "Background image"}>
        <input
          className="ve-pages__input"
          defaultValue={g("background-image")}
          onBlur={(e) => apply("background-image", e.target.value)}
          placeholder='url("…")'
        />
      </Field>
      <Field label={isFa ? "اندازه" : "Size"}>
        <select
          className="ve-pages__input"
          defaultValue={g("background-size") || ""}
          onChange={(e) => apply("background-size", e.target.value)}
        >
          <option value="">—</option>
          {["cover", "contain", "auto", "100% 100%"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={isFa ? "موقعیت" : "Position"}>
        <input
          className="ve-pages__input"
          defaultValue={g("background-position")}
          onBlur={(e) => apply("background-position", e.target.value)}
          placeholder="center"
        />
      </Field>
    </div>
  );
}

function BorderFields({
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
      <Field label={isFa ? "ضخامت" : "Width"}>
        <input
          className="ve-pages__input"
          defaultValue={g("border-width")}
          onBlur={(e) => apply("border-width", e.target.value)}
          placeholder="1px"
        />
      </Field>
      <Field label={isFa ? "استایل" : "Style"}>
        <select
          className="ve-pages__input"
          defaultValue={g("border-style") || "none"}
          onChange={(e) => apply("border-style", e.target.value)}
        >
          {["none", "solid", "dashed", "dotted"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={isFa ? "رنگ" : "Color"}>
        <input
          className="ve-pages__input"
          type="color"
          defaultValue={normalizeColor(g("border-color") || "#e5e5e5")}
          onChange={(e) => apply("border-color", e.target.value)}
        />
      </Field>
      <Field label={isFa ? "گردی گوشه" : "Radius"}>
        <input
          className="ve-pages__input"
          defaultValue={g("border-radius")}
          onBlur={(e) => apply("border-radius", e.target.value)}
        />
      </Field>
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
