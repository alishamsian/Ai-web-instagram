"use client";

/**
 * Bridges Classic EditorEditProvider (inline text + section chrome)
 * into the Puck shell without a second editor model.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePuck } from "@puckeditor/core";
import {
  EditorEditProvider,
  type EditorFieldPath,
  type SectionAction,
  type SectionDropPlace,
} from "@/components/editor/EditContext";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import {
  commandToggleSection,
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
  commandReorderSectionRelative,
  commandAddSection,
} from "@/lib/editor";

export function PuckEditBridge({
  config,
  onConfigChange,
  onRequestInsert,
  onOpenInspector,
  onBrowseTemplates,
  children,
}: {
  config: WebsiteConfig;
  onConfigChange: (next: WebsiteConfig, label?: string) => void;
  onRequestInsert: (afterSectionId: string | null) => void;
  onOpenInspector?: () => void;
  onBrowseTemplates?: () => void;
  children: ReactNode;
}) {
  const { selectedItem, getSelectorForId, dispatch } = usePuck();
  const [selectedField, setSelectedField] = useState<EditorFieldPath | undefined>();
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [hoveredSectionId, setHoveredSectionId] = useState<string | undefined>();

  const puckSectionId =
    (selectedItem?.props?.sectionId as string | undefined) ||
    (selectedItem?.props?.id as string | undefined) ||
    undefined;

  // Keep Classic selection aligned with Puck selection.
  useEffect(() => {
    if (puckSectionId && puckSectionId !== selectedSectionId) {
      setSelectedSectionId(puckSectionId);
      setSelectedField(undefined);
    }
  }, [puckSectionId, selectedSectionId]);

  const selectSection = useCallback(
    (id: string | undefined) => {
      setSelectedSectionId(id);
      setSelectedField(undefined);
      if (!id) {
        dispatch({ type: "setUi", ui: { itemSelector: null } });
        return;
      }
      const selector = getSelectorForId(id);
      if (selector) {
        dispatch({ type: "setUi", ui: { itemSelector: selector } });
      }
    },
    [dispatch, getSelectorForId],
  );

  const handleSectionAction = useCallback(
    (sectionId: string, action: SectionAction) => {
      let result = null;
      if (action === "toggle") {
        result = commandToggleSection(config, sectionId);
      } else if (action === "delete") {
        result = commandDeleteSection(config, sectionId);
      } else if (action === "duplicate") {
        result = commandDuplicateSection(config, sectionId);
      } else if (action === "move-up") {
        result = commandMoveSection(config, sectionId, "up");
      } else if (action === "move-down") {
        result = commandMoveSection(config, sectionId, "down");
      }
      if (!result) return;
      onConfigChange(result.config, result.label);
      if (result.selectedSectionId !== undefined) {
        selectSection(result.selectedSectionId ?? undefined);
      }
      if (action === "delete") {
        setSelectedField(undefined);
      }
    },
    [config, onConfigChange, selectSection],
  );

  const handleReorderSections = useCallback(
    (fromId: string, toId: string, place: SectionDropPlace) => {
      const result = commandReorderSectionRelative(config, fromId, toId, place);
      if (!result) return;
      onConfigChange(result.config, result.label);
      selectSection(fromId);
    },
    [config, onConfigChange, selectSection],
  );

  return (
    <EditorEditProvider
      enabled
      mode="editor"
      selected={selectedField}
      selectedSectionId={selectedSectionId}
      hoveredSectionId={hoveredSectionId}
      config={config}
      onChange={(next) => onConfigChange(next, "Edit")}
      onSelect={(path) => {
        setSelectedField(path);
        // Keep section selected when editing a field inside it.
        if (selectedSectionId) selectSection(selectedSectionId);
      }}
      onSelectSection={selectSection}
      onHoverSection={setHoveredSectionId}
      onSectionAction={handleSectionAction}
      onReorderSections={handleReorderSections}
      onRequestInsert={onRequestInsert}
      onBrowseTemplates={onBrowseTemplates}
      onOpenInspector={onOpenInspector}
    >
      {children}
    </EditorEditProvider>
  );
}

/** Insert a section type after an optional anchor — used by SectionLibrary. */
export function addSectionAfter(
  config: WebsiteConfig,
  type: WebsiteSectionType,
  afterSectionId: string | null,
): { config: WebsiteConfig; label: string; selectedSectionId: string | null } | null {
  const result = commandAddSection(config, type, { afterSectionId });
  if (!result) return null;
  return {
    config: result.config,
    label: result.label,
    selectedSectionId: result.selectedSectionId ?? null,
  };
}
