"use client";

import {
  Circle,
  FileText,
  History,
  ImageIcon,
  LayoutTemplate,
  Palette,
  Settings2,
  Sparkles,
  Tag,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { EditorSiteGroup } from "@/lib/editor";
import type { Dictionary } from "@/lib/i18n/dictionary";

type SiteNavItem = {
  label: string;
  group: EditorSiteGroup;
  Icon: LucideIcon;
};

type SiteNavGroup = {
  title: string;
  items: SiteNavItem[];
};

/**
 * Site settings navigation only — opens existing right inspector groups.
 * Does not duplicate settings editors.
 */
export function SiteNavigationPanel({
  dict,
  onOpenSiteGroup,
}: {
  dict: Dictionary;
  onOpenSiteGroup: (group: EditorSiteGroup) => void;
}) {
  const groups: SiteNavGroup[] = [
    {
      title: dict.editor.groupAppearance,
      items: [
        { label: dict.editor.designSystem, group: "style", Icon: Palette },
        { label: dict.editor.colors, group: "style", Icon: Circle },
        { label: dict.editor.typography, group: "style", Icon: Type },
        { label: dict.editor.designPresets, group: "style", Icon: Sparkles },
      ],
    },
    {
      title: dict.editor.groupContentNav,
      items: [
        { label: dict.editor.brand, group: "content", Icon: Tag },
        { label: dict.editor.content, group: "content", Icon: FileText },
        { label: dict.editor.media, group: "content", Icon: ImageIcon },
      ],
    },
    {
      title: dict.editor.groupPublishing,
      items: [
        { label: dict.editor.seo, group: "site", Icon: FileText },
        { label: dict.editor.settings, group: "site", Icon: Settings2 },
        { label: dict.editor.template, group: "site", Icon: LayoutTemplate },
        { label: dict.editor.versions, group: "site", Icon: History },
      ],
    },
  ];

  return (
    <div className="editor-left-panel-body">
      <nav aria-label={dict.editor.sitePanel} className="editor-site-nav">
        {groups.map((group) => (
          <div key={group.title} className="editor-pages-group">
            <p className="editor-left-group-label">{group.title}</p>
            <ul className="editor-left-row-list" role="list">
              {group.items.map((item) => {
                const Icon = item.Icon;
                return (
                  <li key={`${group.title}-${item.label}`}>
                    <button
                      type="button"
                      onClick={() => onOpenSiteGroup(item.group)}
                      className="editor-left-row"
                    >
                      <Icon
                        size={14}
                        strokeWidth={1.75}
                        className="editor-left-row__icon"
                        aria-hidden
                      />
                      <span className="editor-left-row__label">
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
