"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  EDITOR_VIEWPORT_PRESETS,
  viewportWidth,
  type EditorViewportId,
} from "@/lib/editor";

export function EditorCanvasFrame({
  viewport,
  customWidth = 1280,
  brandName,
  children,
  className,
}: {
  viewport: EditorViewportId;
  customWidth?: number;
  brandName: string;
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(0);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const update = () => setHostWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const targetWidth = viewportWidth(viewport, customWidth);
  const pad = 28;
  const available = Math.max(0, hostWidth - pad * 2);
  const scale = available > 0 ? Math.min(1, available / targetWidth) : 1;
  const isMobile = targetWidth <= 480;
  const isTablet = targetWidth > 480 && targetWidth < 1100;
  const frameHeight = isMobile ? 740 : isTablet ? 920 : 820;
  const presetLabel =
    EDITOR_VIEWPORT_PRESETS.find((p) => p.id === viewport)?.label.en ??
    `${targetWidth}px`;

  return (
    <div
      ref={hostRef}
      className={cn(
        "flex min-h-full w-full items-start justify-center py-6",
        className,
      )}
    >
      <div
        className="relative mx-auto"
        style={{
          width: targetWidth * scale,
          height: frameHeight * scale,
        }}
      >
        <div
          className={cn(
            "editor-frame-chrome absolute start-0 top-0 origin-top-left overflow-hidden bg-white",
            isMobile ? "rounded-[1.85rem]" : "rounded-[12px]",
          )}
          style={{
            width: targetWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
          }}
        >
          {isMobile ? (
            <div className="flex h-8 items-center justify-center border-b border-black/[0.04] bg-[#F3F3F1]">
              <span className="h-1.5 w-[4.5rem] rounded-full bg-black/12" />
            </div>
          ) : (
            <div className="flex h-9 items-center gap-1.5 border-b border-black/[0.05] bg-[#F7F7F5] px-3">
              <span className="size-2 rounded-full bg-[#FF5F57]/90" />
              <span className="size-2 rounded-full bg-[#FEBC2E]/90" />
              <span className="size-2 rounded-full bg-[#28C840]/90" />
              <span className="ms-3 truncate text-[10px] tracking-wide text-black/35">
                {brandName}
                <span className="ms-2 tabular-nums text-black/25">
                  {presetLabel} · {targetWidth}
                </span>
              </span>
            </div>
          )}

          <div
            className="vitrin-editor-canvas overflow-y-auto overflow-x-hidden text-ink"
            style={{
              height: isMobile ? frameHeight - 32 : frameHeight - 36,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
