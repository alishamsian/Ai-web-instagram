"use client";

import { LayoutTemplate, Plus } from "lucide-react";

export function CanvasEmptyState({
  locale,
  onAddSection,
  onBrowseTemplates,
}: {
  locale: "fa" | "en";
  onAddSection: () => void;
  onBrowseTemplates?: () => void;
}) {
  const fa = locale === "fa";
  return (
    <div className="editor-canvas-empty" role="status">
      <div className="editor-canvas-empty-inner">
        <p className="editor-canvas-empty-title">
          {fa ? "صفحه خالی است" : "Your page is empty"}
        </p>
        <p className="editor-canvas-empty-body">
          {fa
            ? "با یک بخش شروع کن یا یک قالب آماده انتخاب کن."
            : "Start with a section or choose a starter template."}
        </p>
        <div className="editor-canvas-empty-actions">
          <button
            type="button"
            className="editor-canvas-empty-primary"
            onClick={onAddSection}
          >
            <Plus size={14} />
            {fa ? "افزودن بخش" : "Add section"}
          </button>
          {onBrowseTemplates ? (
            <button
              type="button"
              className="editor-canvas-empty-secondary"
              onClick={onBrowseTemplates}
            >
              <LayoutTemplate size={14} />
              {fa ? "مرور قالب‌ها" : "Browse templates"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
