"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1180,
};

export function EditorCanvasFrame({
  device,
  brandName,
  children,
  className,
}: {
  device: Device;
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

  const targetWidth = DEVICE_WIDTH[device];
  const pad = 24;
  const available = Math.max(0, hostWidth - pad * 2);
  const scale =
    available > 0 ? Math.min(1, available / targetWidth) : 1;
  const frameHeight =
    device === "mobile" ? 720 : device === "tablet" ? 900 : 780;

  return (
    <div
      ref={hostRef}
      className={cn(
        "flex min-h-full w-full items-start justify-center",
        className,
      )}
    >
      <div
        className="relative mx-auto"
        style={{
          width: targetWidth * scale,
          height: frameHeight * scale,
          marginBlock: pad,
        }}
      >
        <div
          className={cn(
            "absolute start-0 top-0 origin-top-left overflow-hidden bg-white",
            device === "mobile"
              ? "rounded-[1.75rem] border border-white/12 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-black/20"
              : "rounded-xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.4)]",
          )}
          style={{
            width: targetWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
          }}
        >
          {device === "mobile" ? (
            <div className="flex h-7 items-center justify-center border-b border-black/5 bg-[#F7F7F5]">
              <span className="h-1.5 w-16 rounded-full bg-black/15" />
            </div>
          ) : (
            <div className="flex h-9 items-center gap-1.5 border-b border-black/6 bg-[#FAFAF8] px-3">
              <span className="size-2 rounded-full bg-[#FF5F57]" />
              <span className="size-2 rounded-full bg-[#FEBC2E]" />
              <span className="size-2 rounded-full bg-[#28C840]" />
              <span className="ms-3 truncate text-[10px] text-black/40">
                {brandName}
                <span className="ms-2 tabular-nums text-black/25">
                  {targetWidth}px
                </span>
              </span>
            </div>
          )}

          <div
            className="vitrin-editor-canvas overflow-y-auto overflow-x-hidden text-ink"
            style={{
              height:
                device === "mobile" ? frameHeight - 28 : frameHeight - 36,
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
