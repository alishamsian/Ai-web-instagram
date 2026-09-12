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
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0D0D0F] px-3 py-2">
      <div className="inline-flex rounded-lg bg-white/[0.04] p-0.5">
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
                ? "bg-white/[0.1] text-[#F7F7F8]"
                : "text-[#77777F] hover:text-[#B5B5BC]",
            )}
          >
            <Icon size={14} />
            <span className="hidden min-[380px]:inline">{label}</span>
          </button>
        ))}
      </div>
      <span className="tabular-nums text-[10px] text-[#55555C]">
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
      className="shrink-0 border-t border-white/[0.08] bg-[#0D0D0F]"
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
                  ? "bg-white/[0.06] text-[#F7F7F8]"
                  : "text-[#77777F]",
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
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#F7F7F8]">
        {title}
      </p>
      {trailing}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md text-[#77777F] hover:bg-white/[0.06] hover:text-[#F7F7F8]"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
