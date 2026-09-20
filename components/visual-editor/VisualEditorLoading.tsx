"use client";

import { useEffect, useState } from "react";

/**
 * Client-only loading chrome. Avoids SSR/client text mismatches when the
 * parent Suspense fallback and Shell overlay both mount this component.
 */
export function VisualEditorLoading({ label }: { label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="ve-loading"
        aria-busy="true"
        aria-live="polite"
        suppressHydrationWarning
      >
        <div className="ve-loading__pulse" />
        <p
          style={{ margin: 0, fontSize: 14, color: "#8a8a93" }}
          suppressHydrationWarning
        >
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className="ve-loading" aria-busy="true" aria-live="polite">
      <div className="ve-loading__pulse" />
      <p style={{ margin: 0, fontSize: 14, color: "#8a8a93" }}>{label}</p>
    </div>
  );
}
