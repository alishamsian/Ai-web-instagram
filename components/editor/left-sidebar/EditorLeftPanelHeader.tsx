"use client";

import type { ReactNode } from "react";

/**
 * Shared panel chrome: one title, optional short hint, optional action.
 */
export function EditorLeftPanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="editor-left-panel-header">
      <div className="editor-left-panel-header__copy">
        <h2 className="editor-left-panel-header__title">{title}</h2>
        {hint ? <p className="editor-left-panel-header__hint">{hint}</p> : null}
      </div>
      {action ? (
        <div className="editor-left-panel-header__action">{action}</div>
      ) : null}
    </header>
  );
}
