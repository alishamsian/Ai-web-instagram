"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketingTheme } from "@/components/landing/MarketingTheme";

const LOCAL_VIDEO = "/media/hero-bg.mp4";
const REMOTE_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4";

type AtmosphereTone = "blue" | "ember";

/**
 * Atmosphere behind marketing — video + glow for both themes.
 * `ember` keeps the same motion, swaps the blue wash for coral/warm brand light.
 */
export function HeroAtmosphere({ tone = "blue" }: { tone?: AtmosphereTone }) {
  const { theme } = useMarketingTheme();
  const light = theme === "light";
  const ember = tone === "ember";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState(LOCAL_VIDEO);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setReady(false);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const markReady = () => {
      setReady(true);
      if (!document.hidden && window.scrollY < window.innerHeight * 1.15) {
        void video.play().catch(() => undefined);
      }
    };

    if (video.readyState >= 2) markReady();

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      const nearTop = window.scrollY < window.innerHeight * 1.15;
      const visible = nearTop && !document.hidden;
      setActive(visible);
      if (visible) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const baseBg = light
    ? ember
      ? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,90,69,0.1), transparent 55%), radial-gradient(ellipse 50% 40% at 85% 30%, rgba(200,140,90,0.12), transparent 60%), #efeae3"
      : "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,90,69,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 85% 30%, rgba(200,160,120,0.22), transparent 60%), #efeae3"
    : ember
      ? "radial-gradient(ellipse 80% 60% at 55% 45%, rgba(255,107,87,0.14), transparent 62%), radial-gradient(ellipse 45% 35% at 30% 65%, rgba(196,90,50,0.08), transparent 70%), #000"
      : "radial-gradient(ellipse 80% 60% at 55% 45%, rgba(40,90,220,0.28), transparent 62%), radial-gradient(ellipse 45% 35% at 30% 65%, rgba(70,150,255,0.14), transparent 70%), #000";

  const videoFilter = light
    ? ember
      ? "hue-rotate(340deg) saturate(0.7) brightness(1.38) contrast(0.9)"
      : "hue-rotate(205deg) saturate(0.75) brightness(1.35) contrast(0.92)"
    : ember
      ? "hue-rotate(345deg) saturate(0.85) brightness(1.08)"
      : "hue-rotate(205deg) saturate(1.05)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background: baseBg,
        transition: "background 0.45s ease",
      }}
    >
      <video
        ref={videoRef}
        key={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src={src}
        onError={() => {
          if (src !== REMOTE_VIDEO) setSrc(REMOTE_VIDEO);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          pointerEvents: "none",
          opacity:
            ready && active
              ? light
                ? ember
                  ? 0.18
                  : 0.28
                : ember
                  ? 0.22
                  : 0.34
              : 0,
          transition: "opacity 500ms ease, filter 0.45s ease",
          filter: videoFilter,
          mixBlendMode: light ? "multiply" : "normal",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: light
            ? "linear-gradient(180deg, rgba(244,241,236,0.45), rgba(244,241,236,0.12) 28%, rgba(244,241,236,0.28) 58%, rgba(244,241,236,0.78) 82%, rgba(244,241,236,0.98) 100%), radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(244,241,236,0.45) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,.35), transparent 28%, transparent 58%, rgba(0,0,0,.42) 82%, rgba(8,8,8,.92) 100%), radial-gradient(ellipse at 50% 45%, transparent 25%, rgba(0,0,0,.4) 100%)",
          transition: "background 0.45s ease",
        }}
      />
    </div>
  );
}
