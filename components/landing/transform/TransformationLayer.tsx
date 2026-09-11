"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { TransformStage } from "@/lib/demo/instagram-demo";
import { cn } from "@/lib/utils";

/**
 * Rive transformation layer.
 * No .riv asset ships in the repo yet — architecture is ready for
 * `public/rive/instagram-to-website.riv` via @rive-app/react-canvas.
 * Until then, a precise Motion fallback communicates the same states.
 */
export type RiveTransformState =
  | "IDLE"
  | "URL_ENTERED"
  | "ANALYZING"
  | "UNDERSTOOD"
  | "GENERATING"
  | "WEBSITE_READY";

const STAGE_TO_RIVE: Record<TransformStage, RiveTransformState> = {
  idle: "IDLE",
  url: "URL_ENTERED",
  analyzing: "ANALYZING",
  understood: "UNDERSTOOD",
  generating: "GENERATING",
  ready: "WEBSITE_READY",
};

const RIVE_SRC = "/rive/instagram-to-website.riv";

export function TransformationLayer({
  stage,
  reduceMotion = false,
  className,
}: {
  stage: TransformStage;
  reduceMotion?: boolean;
  className?: string;
}) {
  const riveState = STAGE_TO_RIVE[stage];
  const [riveReady, setRiveReady] = useState(false);
  const [RiveComponent, setRiveComponent] = useState<null | React.ComponentType<{
    src: string;
    className?: string;
    stateMachines?: string | string[];
  }>>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch(RIVE_SRC, { method: "HEAD" });
        if (!res.ok) return;
        const mod = await import("@rive-app/react-canvas");
        if (cancelled) return;
        setRiveComponent(() => mod.default);
        setRiveReady(true);
      } catch {
        // Package or asset missing — keep Motion fallback.
        setRiveReady(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const intensity = useMemo(() => {
    switch (stage) {
      case "idle":
        return 0.15;
      case "url":
        return 0.35;
      case "analyzing":
      case "understood":
        return 0.7;
      case "generating":
        return 0.9;
      case "ready":
        return 0.45;
      default:
        return 0.2;
    }
  }, [stage]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
      data-rive-state={riveState}
    >
      {/* Warm atmospheric light connecting to hero */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% 45%, rgba(255,107,87,${0.08 + intensity * 0.1}), transparent 70%)`,
        }}
      />

      {riveReady && RiveComponent ? (
        <RiveComponent src={RIVE_SRC} className="h-full w-full opacity-80" />
      ) : (
        <FallbackFlow stage={stage} reduceMotion={reduceMotion} intensity={intensity} />
      )}
    </div>
  );
}

function FallbackFlow({
  stage,
  reduceMotion,
  intensity,
}: {
  stage: TransformStage;
  reduceMotion: boolean;
  intensity: number;
}) {
  const active = stage !== "idle" && stage !== "ready";

  return (
    <div className="absolute inset-0">
      {/* Horizontal data beam */}
      <div className="absolute start-[18%] end-[18%] top-[48%] h-px overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        {!reduceMotion ? (
          <motion.div
            className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            animate={
              active
                ? { x: ["-40%", "380%"], opacity: [0.2, 0.9, 0.2] }
                : { x: "-40%", opacity: intensity }
            }
            transition={{
              duration: stage === "generating" ? 1.1 : 1.8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ) : null}
      </div>

      {/* Vertical mobile connector */}
      <div className="absolute start-1/2 top-[28%] bottom-[28%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-accent/35 to-transparent lg:hidden" />

      {/* Precise nodes */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          animate={
            reduceMotion
              ? { opacity: intensity }
              : {
                  opacity: [0.15, 0.85, 0.15],
                  y: [(-40 - i * 18) * (stage === "ready" ? 0.4 : 1), 40 + i * 12],
                  x: [(-120 + i * 120) * (active ? 1 : 0.3), 120 - i * 100],
                }
          }
          transition={{
            duration: 2.4 + i * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.25,
          }}
        />
      ))}

      {/* Soft scan line during analysis */}
      {(stage === "analyzing" || stage === "understood" || stage === "generating") &&
      !reduceMotion ? (
        <motion.div
          className="absolute inset-x-[22%] h-px bg-accent/50"
          animate={{ top: ["28%", "72%"], opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </div>
  );
}
