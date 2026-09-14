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
  type EditorZoomMode,
} from "@/lib/editor";

function computeScale(
  hostWidth: number,
  targetWidth: number,
  zoom: EditorZoomMode,
  pad: number,
) {
  const available = Math.max(0, hostWidth - pad * 2);
  const fit = available > 0 ? Math.min(1, available / targetWidth) : 1;
  if (zoom === "fit") return fit;
  if (zoom === "75") return 0.75;
  return 1;
}

function FrameChrome({
  targetWidth,
  frameHeight,
  scale,
  brandName,
  presetLabel,
  isMobile,
  children,
}: {
  targetWidth: number;
  frameHeight: number;
  scale: number;
  brandName: string;
  presetLabel: string;
  isMobile: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: targetWidth * scale,
        height: frameHeight * scale,
      }}
    >
      <div
        className={cn(
          "editor-frame-chrome absolute start-0 top-0 origin-top-left overflow-hidden bg-white",
            isMobile ? "rounded-[1.35rem]" : "rounded-[8px]",
        )}
        style={{
          width: targetWidth,
          height: frameHeight,
          transform: `scale(${scale})`,
        }}
      >
        {isMobile ? (
          <div className="flex h-6 items-center justify-center border-b border-black/[0.04] bg-[#F7F7F5]">
            <span className="h-1 w-14 rounded-full bg-black/10" />
          </div>
        ) : (
          <div className="flex h-7 items-center gap-1.5 border-b border-black/[0.04] bg-[#F5F5F3] px-2.5">
            <span className="size-1.5 rounded-full bg-black/12" />
            <span className="size-1.5 rounded-full bg-black/12" />
            <span className="size-1.5 rounded-full bg-black/12" />
            <span className="ms-2 truncate text-[10px] text-black/35">
              {brandName}
              <span className="ms-1.5 tabular-nums text-black/22">
                {presetLabel}
              </span>
            </span>
          </div>
        )}
        <div
          className="vitrin-editor-canvas overflow-y-auto overflow-x-hidden text-ink"
          style={{
            height: isMobile ? frameHeight - 24 : frameHeight - 28,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function EditorCanvasFrame({
  viewport,
  customWidth = 1280,
  brandName,
  children,
  className,
  zoom = "fit",
  splitPreview = false,
}: {
  viewport: EditorViewportId;
  customWidth?: number;
  brandName: string;
  children: ReactNode;
  className?: string;
  zoom?: EditorZoomMode;
  splitPreview?: boolean;
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

  const desktopWidth = viewportWidth("1280", customWidth);
  const mobileWidth = viewportWidth("390", customWidth);
  const primaryWidth = viewportWidth(viewport, customWidth);
  const pad = splitPreview ? 28 : 48;

  if (splitPreview) {
    const half = hostWidth > 0 ? hostWidth / 2 : 0;
    const deskScale = computeScale(half, desktopWidth, zoom === "fit" ? "fit" : zoom, pad);
    const mobScale = computeScale(half, mobileWidth, zoom === "fit" ? "fit" : zoom, pad);
    return (
      <div
        ref={hostRef}
        className={cn(
          "editor-canvas-anim flex min-h-full w-full items-start justify-center gap-5 overflow-x-auto px-4 py-10",
          className,
        )}
      >
        <FrameChrome
          targetWidth={desktopWidth}
          frameHeight={800}
          scale={deskScale}
          brandName={brandName}
          presetLabel="Desktop"
          isMobile={false}
        >
          {children}
        </FrameChrome>
        <FrameChrome
          targetWidth={mobileWidth}
          frameHeight={720}
          scale={mobScale}
          brandName={brandName}
          presetLabel="Mobile"
          isMobile
        >
          <div className="pointer-events-none select-none" aria-hidden>
            {children}
          </div>
        </FrameChrome>
      </div>
    );
  }

  const targetWidth = primaryWidth;
  const scale = computeScale(hostWidth, targetWidth, zoom, pad);
  const isMobile = targetWidth <= 480;
  const isTablet = targetWidth > 480 && targetWidth < 1100;
  const frameHeight = isMobile ? 720 : isTablet ? 880 : 800;
  const presetLabel =
    EDITOR_VIEWPORT_PRESETS.find((p) => p.id === viewport)?.label.en ??
    `${targetWidth}px`;

  return (
    <div
      ref={hostRef}
      className={cn(
        "editor-canvas-anim flex min-h-full w-full items-start justify-center overflow-x-auto py-10",
        className,
      )}
    >
      <FrameChrome
        targetWidth={targetWidth}
        frameHeight={frameHeight}
        scale={scale}
        brandName={brandName}
        presetLabel={presetLabel}
        isMobile={isMobile}
      >
        {children}
      </FrameChrome>
    </div>
  );
}
