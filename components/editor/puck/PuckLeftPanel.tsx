"use client";

import { useMemo, useState } from "react";
import { Puck, usePuck } from "@puckeditor/core";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Layers,
  Package,
  Trash2,
} from "lucide-react";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import { getSectionDefinition } from "@/lib/store/registry";
import { humanSectionLabel } from "@/lib/puck/binding";
import { bindToggleSectionVisibility } from "@/lib/puck/binding";
import {
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
} from "@/lib/editor";
import { AssetsPanel } from "@/components/editor/left-sidebar/AssetsPanel";
import { PagesPanel } from "@/components/editor/left-sidebar/PagesPanel";
import { getDictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

type LeftTab = "layers" | "components" | "assets" | "pages";

export function PuckLeftPanel({
  locale,
  config,
  onConfigChange,
  activePage,
  onPageChange,
}: {
  locale: Locale;
  config: WebsiteConfig;
  onConfigChange: (next: WebsiteConfig, label?: string) => void;
  activePage: string;
  onPageChange: (pageId: string) => void;
}) {
  const isFa = locale === "fa";
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const [tab, setTab] = useState<LeftTab>("components");
  const { selectedItem, getSelectorForId, dispatch } = usePuck();

  const tabs: { id: LeftTab; icon: typeof Layers; fa: string; en: string }[] = [
    { id: "components", icon: Package, fa: "کامپوننت", en: "Components" },
    { id: "layers", icon: Layers, fa: "لایه‌ها", en: "Layers" },
    { id: "assets", icon: ImageIcon, fa: "رسانه", en: "Assets" },
    { id: "pages", icon: FileText, fa: "صفحات", en: "Pages" },
  ];

  function runLayerAction(
    sectionId: string,
    action: "duplicate" | "delete" | "up" | "down",
  ) {
    let result = null;
    if (action === "duplicate") {
      result = commandDuplicateSection(config, sectionId);
    } else if (action === "delete") {
      result = commandDeleteSection(config, sectionId);
    } else if (action === "up") {
      result = commandMoveSection(config, sectionId, "up");
    } else if (action === "down") {
      result = commandMoveSection(config, sectionId, "down");
    }
    if (!result) return;
    onConfigChange(result.config, result.label);
    if (result.selectedSectionId) {
      const selector = getSelectorForId(result.selectedSectionId);
      if (selector) {
        dispatch({ type: "setUi", ui: { itemSelector: selector } });
      }
    }
  }

  return (
    <aside
      className="flex h-full w-[296px] shrink-0 flex-col border-e border-zinc-800/80 bg-[#18181b] text-zinc-100"
      aria-label={isFa ? "ناوبری ادیتور" : "Editor navigation"}
    >
      <div className="grid grid-cols-4 gap-0.5 border-b border-zinc-800 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              title={isFa ? t.fa : t.en}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition",
                tab === t.id
                  ? "bg-white text-zinc-900"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              <Icon className="size-3.5" />
              <span className="truncate">{isFa ? t.fa : t.en}</span>
            </button>
          );
        })}
      </div>

      {tab === "components" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-zinc-800 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {isFa ? "کشیدن به بوم" : "Drag onto canvas"}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              {isFa
                ? "مثل دموی Puck — کامپوننت را بکشید و رها کنید"
                : "Like the Puck demo — drag a component onto the page"}
            </p>
          </div>
          <div className="puck-components-host min-h-0 flex-1 overflow-y-auto p-2">
            <Puck.Components />
          </div>
        </div>
      ) : null}

      {tab === "layers" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-zinc-800 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {isFa ? "ساختار صفحه" : "Page structure"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {config.sections.map((section, index) => {
                const def = getSectionDefinition(section.type);
                const label = humanSectionLabel(
                  section,
                  locale,
                  def?.label ?? null,
                );
                const selected =
                  selectedItem?.props?.id === section.id ||
                  selectedItem?.props?.sectionId === section.id;
                return (
                  <li key={section.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm",
                        selected
                          ? "bg-white text-zinc-900"
                          : "text-zinc-200 hover:bg-zinc-800",
                        !section.visible && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate px-1 text-start text-xs font-medium"
                        onClick={() => {
                          const selector = getSelectorForId(section.id);
                          if (selector) {
                            dispatch({
                              type: "setUi",
                              ui: { itemSelector: selector },
                            });
                          }
                        }}
                      >
                        {label}
                      </button>
                      <LayerIcon
                        title={section.visible ? (isFa ? "مخفی" : "Hide") : (isFa ? "نمایش" : "Show")}
                        selected={selected}
                        onClick={() =>
                          bindToggleSectionVisibility({
                            config,
                            sectionId: section.id,
                            onChange: (next) =>
                              onConfigChange(next, "Toggle visibility"),
                          })
                        }
                      >
                        {section.visible ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                      </LayerIcon>
                      <LayerIcon
                        title={isFa ? "بالا" : "Move up"}
                        selected={selected}
                        disabled={index === 0}
                        onClick={() => runLayerAction(section.id, "up")}
                      >
                        <ArrowUp className="size-3" />
                      </LayerIcon>
                      <LayerIcon
                        title={isFa ? "پایین" : "Move down"}
                        selected={selected}
                        disabled={index === config.sections.length - 1}
                        onClick={() => runLayerAction(section.id, "down")}
                      >
                        <ArrowDown className="size-3" />
                      </LayerIcon>
                      <LayerIcon
                        title={isFa ? "کپی" : "Duplicate"}
                        selected={selected}
                        onClick={() => runLayerAction(section.id, "duplicate")}
                      >
                        <Copy className="size-3" />
                      </LayerIcon>
                      <LayerIcon
                        title={isFa ? "حذف" : "Delete"}
                        selected={selected}
                        onClick={() => runLayerAction(section.id, "delete")}
                      >
                        <Trash2 className="size-3" />
                      </LayerIcon>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                {isFa ? "Outline پوک" : "Puck outline"}
              </p>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-1">
                <Puck.Outline />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "assets" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-white text-zinc-900">
          <AssetsPanel config={config} dict={dict} locale={locale} />
        </div>
      ) : null}

      {tab === "pages" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-white text-zinc-900">
          <PagesPanel
            dict={dict}
            locale={locale}
            activePage={activePage}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </aside>
  );
}

function LayerIcon({
  title,
  selected,
  disabled,
  onClick,
  children,
}: {
  title: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(
        "rounded p-1 opacity-0 transition group-hover:opacity-100 disabled:opacity-20",
        selected ? "hover:bg-zinc-200" : "hover:bg-zinc-700",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
