"use client";

import { EditorLayersPanel } from "@/components/editor/EditorLayersPanel";
import { EditorLeftPanelHeader } from "@/components/editor/left-sidebar/EditorLeftPanelHeader";
import { EditorLeftRail } from "@/components/editor/left-sidebar/EditorLeftRail";
import { PagesPanel } from "@/components/editor/left-sidebar/PagesPanel";
import { AddPanel } from "@/components/editor/left-sidebar/AddPanel";
import { AssetsPanel } from "@/components/editor/left-sidebar/AssetsPanel";
import { SiteNavigationPanel } from "@/components/editor/left-sidebar/SiteNavigationPanel";
import type { LeftNavTab } from "@/components/editor/left-sidebar/types";
import type { EditorSiteGroup } from "@/lib/editor";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import {
  FileStack,
  Globe2,
  ImageIcon,
  Layers3,
  Plus,
} from "lucide-react";

export type { LeftNavTab } from "@/components/editor/left-sidebar/types";

/**
 * LEFT = navigate + organize.
 * RIGHT inspector remains the property editor.
 */
export function EditorSidebar({
  config,
  dict,
  locale,
  nav,
  selectedSectionId,
  selectedField,
  hoveredSectionId,
  activePage,
  onNavChange,
  onSelectSection,
  onSelectField,
  onHoverSection,
  onChange,
  onAddSection,
  onInsertType,
  onPageChange,
  onOpenSiteGroup,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  nav: LeftNavTab;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  hoveredSectionId?: string;
  activePage: string;
  onNavChange: (tab: LeftNavTab) => void;
  onSelectSection: (id: string | undefined) => void;
  onSelectField: (path: EditorFieldPath, sectionId: string) => void;
  onHoverSection?: (id: string | undefined) => void;
  onChange: (next: WebsiteConfig) => void;
  onAddSection: () => void;
  onInsertType: (type: WebsiteSectionType) => void;
  onPageChange: (pageId: string) => void;
  onOpenSiteGroup: (group: EditorSiteGroup) => void;
}) {
  const rail = [
    { id: "views" as const, label: dict.editor.pages, icon: FileStack },
    { id: "layers" as const, label: dict.editor.layers, icon: Layers3 },
    { id: "insert" as const, label: dict.editor.addNav, icon: Plus },
    { id: "assets" as const, label: dict.editor.assets, icon: ImageIcon },
    { id: "site" as const, label: dict.editor.sitePanel, icon: Globe2 },
  ];

  const panelMeta: Record<
    LeftNavTab,
    { title: string; hint?: string; showAdd?: boolean }
  > = {
    views: {
      title: dict.editor.pages,
      hint: dict.editor.pagesHint,
    },
    layers: {
      title: dict.editor.layers,
      showAdd: true,
    },
    insert: {
      title: dict.editor.addNav,
      hint: dict.editor.addHint,
    },
    assets: {
      title: dict.editor.assets,
    },
    site: {
      title: dict.editor.sitePanel,
      hint: dict.editor.siteNavHint,
    },
  };

  const meta = panelMeta[nav];

  return (
    <div className="editor-sidebar-shell flex h-full min-h-0 bg-[color:var(--ed-bg-elevated)]">
      <EditorLeftRail
        items={rail}
        active={nav}
        ariaLabel={dict.editor.leftRailLabel}
        onChange={onNavChange}
      />

      <div className="editor-left-panel flex min-h-0 min-w-0 flex-1 flex-col border-s border-[color:var(--ed-border)]">
        <EditorLeftPanelHeader
          title={meta.title}
          hint={meta.hint}
          action={
            meta.showAdd ? (
              <button
                type="button"
                className="editor-left-header-icon-btn"
                aria-label={dict.editor.addSection}
                title={dict.editor.addSection}
                onClick={onAddSection}
              >
                <Plus size={15} strokeWidth={1.75} aria-hidden />
              </button>
            ) : undefined
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {nav === "views" ? (
            <PagesPanel
              dict={dict}
              locale={locale}
              activePage={activePage}
              onPageChange={onPageChange}
            />
          ) : null}
          {nav === "layers" ? (
            <EditorLayersPanel
              config={config}
              dict={dict}
              locale={locale}
              selectedSectionId={selectedSectionId}
              selectedField={selectedField}
              hoveredSectionId={hoveredSectionId}
              onSelectSection={onSelectSection}
              onSelectField={onSelectField}
              onHoverSection={onHoverSection}
              onChange={onChange}
              onAddSection={onAddSection}
              compactChrome
            />
          ) : null}
          {nav === "insert" ? (
            <AddPanel
              config={config}
              dict={dict}
              locale={locale}
              onInsertType={onInsertType}
              onOpenLibrary={onAddSection}
            />
          ) : null}
          {nav === "assets" ? (
            <AssetsPanel config={config} dict={dict} locale={locale} />
          ) : null}
          {nav === "site" ? (
            <SiteNavigationPanel
              dict={dict}
              onOpenSiteGroup={onOpenSiteGroup}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
