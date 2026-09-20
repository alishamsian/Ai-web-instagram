"use client";

/**
 * Recursive renderer for canonical nested WebsiteComponentNode trees.
 * Used by WebsiteRenderer — never reads GrapesJS JSON.
 */

import type { CSSProperties } from "react";
import type { WebsiteComponentNode, WebsiteConfig } from "@/types/website";
import {
  isComponentVisibleAt,
  resolveComponentStyleProp,
  type DeviceBreakpoint,
} from "@/lib/website/component-tree";

const VISIBILITY_CSS = `
[data-canonical-tree] [data-visible-desktop="false"]{display:none!important}
@media (max-width:1023px) and (min-width:768px){
  [data-canonical-tree] [data-visible-tablet="false"]{display:none!important}
  [data-canonical-tree] [data-visible-tablet="true"]{display:revert!important}
}
@media (max-width:767px){
  [data-canonical-tree] [data-visible-mobile="false"]{display:none!important}
  [data-canonical-tree] [data-visible-mobile="true"]{display:revert!important}
}
`;

function resolveMediaUrl(
  config: WebsiteConfig,
  content: Record<string, unknown> | undefined,
): { src: string; alt: string } {
  const mediaId =
    typeof content?.mediaId === "string" ? content.mediaId : undefined;
  if (mediaId && config.media[mediaId]) {
    return {
      src: config.media[mediaId]!.url,
      alt:
        (typeof content?.alt === "string" && content.alt) ||
        config.media[mediaId]!.alt ||
        "",
    };
  }
  return {
    src: typeof content?.src === "string" ? content.src : "",
    alt: typeof content?.alt === "string" ? content.alt : "",
  };
}

function stylesForDevice(
  node: WebsiteComponentNode,
  device: DeviceBreakpoint,
): CSSProperties {
  const props = [
    "display",
    "position",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-align",
    "text-transform",
    "text-decoration",
    "color",
    "background",
    "background-color",
    "background-image",
    "background-position",
    "background-size",
    "background-repeat",
    "border",
    "border-width",
    "border-style",
    "border-color",
    "border-radius",
    "opacity",
    "box-shadow",
    "gap",
    "flex-direction",
    "justify-content",
    "align-items",
    "flex-wrap",
    "grid-template-columns",
    "grid-template-rows",
    "overflow",
    "object-fit",
  ];
  const style: Record<string, string> = {};
  // Start from desktop base styles
  if (node.styles) Object.assign(style, node.styles);
  for (const prop of props) {
    const resolved = resolveComponentStyleProp(node, prop, device);
    if (resolved.value) style[prop] = resolved.value;
  }
  return style as CSSProperties;
}

function visibilityClass(node: WebsiteComponentNode): string {
  void node;
  return "";
}

function textOf(node: WebsiteComponentNode): string {
  if (typeof node.content?.text === "string") return node.content.text;
  if (typeof node.content?.label === "string") return node.content.label;
  return "";
}

function NestedNode({
  node,
  config,
  device,
}: {
  node: WebsiteComponentNode;
  config: WebsiteConfig;
  device: DeviceBreakpoint;
}) {
  if (node.hidden) return null;

  const style = stylesForDevice(node, device);
  const type = node.type;
  const children = node.children?.map((child) => (
    <NestedNode
      key={child.id}
      node={child}
      config={config}
      device={device}
    />
  ));

  const common = {
    "data-component-id": node.id,
    "data-component-type": type,
    "data-component-variant": node.variant || undefined,
    "data-locked": node.locked ? "true" : undefined,
    "data-visible-desktop":
      node.visibility?.desktop == null
        ? undefined
        : node.visibility.desktop
          ? "true"
          : "false",
    "data-visible-tablet":
      node.visibility?.tablet == null
        ? undefined
        : node.visibility.tablet
          ? "true"
          : "false",
    "data-visible-mobile":
      node.visibility?.mobile == null
        ? undefined
        : node.visibility.mobile
          ? "true"
          : "false",
    className: visibilityClass(node),
    style,
  } as const;

  // Hide per current device for publish/preview (SSR-safe approximate via CSS)
  const hiddenNow = !isComponentVisibleAt(node, device);
  if (hiddenNow && device !== "desktop") {
    // Still emit with hidden attribute for tests; CSS handles multi-device
  }

  switch (type) {
    case "content-heading": {
      const level =
        (typeof node.content?.level === "string" && node.content.level) ||
        (typeof node.props?.tagName === "string" && node.props.tagName) ||
        "h2";
      const Tag = (/^h[1-6]$/i.test(String(level))
        ? String(level).toLowerCase()
        : "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag {...common}>{textOf(node)}</Tag>;
    }
    case "content-text":
      return <p {...common}>{textOf(node)}</p>;
    case "content-button": {
      const href =
        typeof node.content?.href === "string" ? node.content.href : "#";
      const target =
        typeof node.content?.target === "string"
          ? node.content.target
          : undefined;
      return (
        <a {...common} href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined}>
          {textOf(node) || "Button"}
        </a>
      );
    }
    case "media-image": {
      const { src, alt } = resolveMediaUrl(config, node.content);
      if (!src) {
        return (
          <div {...common} role="img" aria-label={alt || "Image"}>
            {children}
          </div>
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...common}
          src={src}
          alt={alt}
          style={{
            ...style,
            objectFit:
              (node.props?.objectFit as CSSProperties["objectFit"]) ||
              style.objectFit ||
              "cover",
          }}
        />
      );
    }
    case "media-video": {
      const src =
        typeof node.content?.src === "string" ? node.content.src : "";
      const poster =
        typeof node.content?.poster === "string" ? node.content.poster : undefined;
      if (!src) return <div {...common}>{children}</div>;
      return (
        <video {...common} src={src} poster={poster} controls playsInline />
      );
    }
    case "layout-divider":
      return <hr {...common} />;
    case "layout-spacer":
      return <div {...common} aria-hidden="true" />;
    case "form-input":
      return (
        <input
          {...common}
          type="text"
          name={
            typeof node.content?.name === "string"
              ? node.content.name
              : undefined
          }
          placeholder={
            typeof node.content?.placeholder === "string"
              ? node.content.placeholder
              : undefined
          }
          required={Boolean(node.content?.required)}
          aria-label={
            typeof node.props?.ariaLabel === "string"
              ? String(node.props.ariaLabel)
              : typeof node.content?.label === "string"
                ? node.content.label
                : "Input"
          }
        />
      );
    case "form-textarea":
      return (
        <textarea
          {...common}
          name={
            typeof node.content?.name === "string"
              ? node.content.name
              : undefined
          }
          placeholder={
            typeof node.content?.placeholder === "string"
              ? node.content.placeholder
              : undefined
          }
          required={Boolean(node.content?.required)}
          aria-label={
            typeof node.content?.label === "string"
              ? node.content.label
              : "Message"
          }
        />
      );
    case "form-select":
      return (
        <select
          {...common}
          aria-label={
            typeof node.props?.ariaLabel === "string"
              ? String(node.props.ariaLabel)
              : "Select"
          }
        >
          {children}
        </select>
      );
    case "form-checkbox":
      return (
        <label {...common}>
          <input type="checkbox" />
          <span>{textOf(node)}</span>
        </label>
      );
    case "form-form":
      return (
        <form {...common} onSubmit={(e) => e.preventDefault()}>
          {children}
        </form>
      );
    case "nav-navbar":
      return <nav {...common}>{children || textOf(node)}</nav>;
    case "nav-footer":
      return <footer {...common}>{children || textOf(node)}</footer>;
    case "content-card":
    case "layout-container":
    case "layout-row":
    case "layout-column":
    case "layout-stack":
    case "layout-grid":
    case "layout-flex":
    case "layout-columns":
      return <div {...common}>{children}</div>;
    case "content-icon":
      return (
        <span {...common} aria-hidden={textOf(node) ? undefined : true}>
          {textOf(node) || children}
        </span>
      );
    case "unknown":
    default:
      return (
        <div {...common} data-fallback-type={type}>
          {children}
          {!node.children?.length ? textOf(node) : null}
          {node.children?.length && textOf(node) ? (
            <span data-fallback-text="true">{textOf(node)}</span>
          ) : null}
        </div>
      );
  }
}

export function NestedComponentTree({
  nodes,
  config,
  device = "desktop",
}: {
  nodes: WebsiteComponentNode[] | undefined;
  config: WebsiteConfig;
  device?: DeviceBreakpoint;
}) {
  if (!nodes?.length) return null;
  return (
    <div data-canonical-tree="true">
      <style dangerouslySetInnerHTML={{ __html: VISIBILITY_CSS }} />
      {nodes.map((node) => (
        <NestedNode
          key={node.id}
          node={node}
          config={config}
          device={device}
        />
      ))}
    </div>
  );
}
