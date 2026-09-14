"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Eye,
  Layers,
  LayoutTemplate,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

type Device = "desktop" | "tablet" | "mobile";

export function EditorViewportBar({
  device,
  labels,
  onChange,
}: {
  device: Device;
  labels: { desktop: string; tablet: string; mobile: string };
  onChange: (device: Device) => void;
}) {
  const items = [
    { id: "mobile" as const, icon: Smartphone, label: labels.mobile, width: "390" },
    { id: "tablet" as const, icon: Tablet, label: labels.tablet, width: "768" },
    { id: "desktop" as const, icon: Monitor, label: labels.desktop, width: "1180" },
  ];

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--ed-border)] bg-[color:var(--ed-bg)] px-3 py-2">
      <div className="editor-tool-group">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={device === id}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition",
              device === id
                ? "bg-white/[0.1] text-[color:var(--ed-fg)]"
                : "text-[color:var(--ed-muted)] hover:text-[color:var(--ed-fg)]",
            )}
          >
            <Icon size={14} />
            <span className="hidden min-[380px]:inline">{label}</span>
          </button>
        ))}
      </div>
      <span className="tabular-nums text-[10px] text-[color:var(--ed-subtle)]">
        {items.find((item) => item.id === device)?.width}px
      </span>
    </div>
  );
}

export function EditorPhoneTabBar({
  active,
  labels,
  onChange,
}: {
  active: "canvas" | "sections" | "inspector";
  labels: { canvas: string; sections: string; inspector: string };
  onChange: (tab: "canvas" | "sections" | "inspector") => void;
}) {
  const tabs = [
    { id: "sections" as const, icon: LayoutTemplate, label: labels.sections },
    { id: "canvas" as const, icon: Eye, label: labels.canvas },
    { id: "inspector" as const, icon: Layers, label: labels.inspector },
  ];

  return (
    <nav
      className="shrink-0 border-t border-[color:var(--ed-border)] bg-[color:var(--ed-bg)]"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-3 gap-1 px-2 pt-1.5">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition",
                isActive
                  ? "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]"
                  : "text-[color:var(--ed-muted)]",
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function EditorPaneHeader({
  title,
  onClose,
  trailing,
}: {
  title: string;
  onClose?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[color:var(--ed-border)] px-3">
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[color:var(--ed-fg)]">
        {title}
      </p>
      {trailing}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="editor-icon-btn"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
