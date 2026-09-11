"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  ICON_SIZE,
  IconAI,
  IconBusinessType,
  IconPersonality,
  IconProducts,
  IconSections,
  IconServices,
  IconVisualStyle,
} from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/chrome";
import { Badge } from "@/components/ui/badge";
import { DEMO_POSTS } from "@/lib/demo/store";
import type { Dictionary } from "@/lib/i18n/dictionary";

const insights = [
  { key: "type", value: "Fashion brand", icon: IconBusinessType },
  { key: "tone", value: "Minimal · Premium · Modern", icon: IconPersonality },
  {
    key: "colors",
    value: "Black · Warm beige · White",
    swatches: ["#1C1917", "#F5F0EA", "#FFFFFF"],
    icon: IconVisualStyle,
  },
  { key: "products", value: "Coats · Dresses · Accessories", icon: IconProducts },
  { key: "services", value: "—", icon: IconServices },
  { key: "sections", value: "Hero · Products · About · Gallery · Contact", icon: IconSections },
] as const;

export function AIUnderstanding({ dict }: { dict: Dictionary }) {
  const reduce = useReducedMotion();
  return (
    <Section className="border-t border-border">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={dict.ai.title} body={dict.ai.body} />
        <Badge tone="ai">
          <IconAI size={14} aria-hidden />
          Brand intelligence
        </Badge>
      </div>
      <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <p className="text-xs text-muted-foreground">Imported content</p>
              <p className="text-xs text-muted-foreground">@nooran.studio</p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border">
              {DEMO_POSTS.slice(0, 6).map((post) => (
                <Image
                  key={post.id}
                  src={post.displayUrl ?? ""}
                  alt=""
                  width={280}
                  height={320}
                  className="aspect-[4/5] w-full bg-white object-cover"
                />
              ))}
            </div>
          </div>
        </Reveal>
        <div className="space-y-2.5">
          {insights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                className="rounded-xl border border-border bg-white px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <span className="icon-tile icon-tile--ai size-9">
                    <Icon size={ICON_SIZE.sm} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{dict.ai.labels[item.key]}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <p className="text-sm font-medium">{item.value}</p>
                      {"swatches" in item ? (
                        <span className="ms-auto flex gap-1.5">
                          {item.swatches.map((color) => (
                            <span
                              key={color}
                              className="size-3.5 rounded-full border border-border"
                              style={{ background: color }}
                              aria-hidden
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
