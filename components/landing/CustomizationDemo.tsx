"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ICON_SIZE,
  IconColors,
  IconContent,
  IconLayout,
  IconTypography,
} from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { BrowserFrame } from "@/components/shared/chrome";
import { DEMO_POSTS } from "@/lib/demo/store";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const palettes = [
  { primary: "#1C1917", surface: "#F4EFE8", label: "Editorial" },
  { primary: "#0F766E", surface: "#F0FAF8", label: "Fresh" },
  { primary: "#44403C", surface: "#FAFAF9", label: "Stone" },
];

const typefaces = [
  { label: "Display", className: "font-display tracking-tight" },
  { label: "Sans", className: "font-sans tracking-tight" },
];

export function CustomizationDemo({ dict }: { dict: Dictionary }) {
  const [palette, setPalette] = useState(0);
  const [type, setType] = useState(0);
  const color = palettes[palette];
  const face = typefaces[type];

  return (
    <Section className="border-t border-border">
      <SectionHeading title={dict.customize.title} body={dict.customize.body} />
      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
        <BrowserFrame url="nooran.vitrin.app">
          <div
            className="p-8 transition-colors duration-300 md:p-10"
            style={{ background: color.surface }}
          >
            <p className="text-xs tracking-[0.2em]" style={{ color: color.primary }}>
              NOORAN
            </p>
            <h3
              className={cn("mt-4 text-3xl md:text-4xl", face.className)}
              style={{ color: color.primary }}
            >
              Quiet clothes for a loud city.
            </h3>
            <span
              className="mt-6 inline-flex rounded-md px-4 py-2 text-sm text-white"
              style={{ background: color.primary }}
            >
              Shop the collection
            </span>
            <div className="mt-8 grid grid-cols-3 gap-2">
              {DEMO_POSTS.slice(0, 3).map((post) => (
                <Image
                  key={post.id}
                  src={post.displayUrl ?? ""}
                  alt=""
                  width={200}
                  height={240}
                  className="aspect-[4/5] w-full object-cover"
                />
              ))}
            </div>
          </div>
        </BrowserFrame>

        <aside className="rounded-2xl border border-border bg-white p-5 md:p-6">
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconColors size={ICON_SIZE.sm} aria-hidden />
              {dict.editor.colors}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={dict.editor.colors}>
              {palettes.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  role="radio"
                  aria-checked={palette === index}
                  aria-label={item.label}
                  onClick={() => setPalette(index)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                    palette === index
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-white hover:bg-muted",
                  )}
                >
                  <span
                    className="size-3.5 rounded-full border border-black/10"
                    style={{ background: item.primary }}
                    aria-hidden
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconTypography size={ICON_SIZE.sm} aria-hidden />
              {dict.editor.typography}
            </p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label={dict.editor.typography}>
              {typefaces.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  role="radio"
                  aria-checked={type === index}
                  onClick={() => setType(index)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs transition-colors",
                    type === index
                      ? "border-ink bg-ink text-white"
                      : "border-border bg-white hover:bg-muted",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <IconLayout size={ICON_SIZE.sm} aria-hidden />
              {dict.editor.sections}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconContent size={ICON_SIZE.sm} aria-hidden />
              {dict.editor.layout}
            </span>
          </div>
        </aside>
      </div>
    </Section>
  );
}
