"use client";

export function VisualEditorLoading({ label }: { label: string }) {
  return (
    <div className="ve-loading" aria-busy="true" aria-live="polite">
      <div className="ve-loading__pulse" />
      <p style={{ margin: 0, fontSize: 14, color: "#8a8a93" }}>{label}</p>
    </div>
  );
}
