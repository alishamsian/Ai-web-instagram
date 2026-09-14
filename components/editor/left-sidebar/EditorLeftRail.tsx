"use client";

import type { LeftNavTab } from "@/components/editor/left-sidebar/types";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type LeftRailItem = {
  id: LeftNavTab;
  label: string;
  icon: LucideIcon;
};

/**
 * Compact icon rail — navigation destinations, not property tabs.
 */
export function EditorLeftRail({
  items,
  active,
  ariaLabel,
  onChange,
}: {
  items: LeftRailItem[];
  active: LeftNavTab;
  ariaLabel: string;
  onChange: (id: LeftNavTab) => void;
}) {
  return (
    <nav className="editor-left-rail" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
            data-active={isActive}
            className={cn("editor-left-rail-btn")}
            onClick={() => onChange(item.id)}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
            <span className="editor-left-rail-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
