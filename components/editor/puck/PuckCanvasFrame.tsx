"use client";

import { usePuck } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";

/** Canvas frame sized to the active device viewport + zoom. */
export function PuckCanvasFrame({ zoom }: { zoom: number }) {
  const { appState } = usePuck();
  const width = appState.ui.viewports.current.width;
  const frameWidth = typeof width === "number" ? width : 1440;

  return (
    <div className="flex min-h-full justify-center">
      <div
        className="origin-top overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm transition-[width,transform]"
        style={{
          width: frameWidth,
          maxWidth: "100%",
          transform: `scale(${zoom})`,
        }}
      >
        <Puck.Preview />
      </div>
    </div>
  );
}
