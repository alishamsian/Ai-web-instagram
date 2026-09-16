"use client";

/**
 * Context + Puck plugin so AI Co-Designer lives in the left sidebar
 * next to Blocks / Outline (official Puck plugin rail).
 */

import { createContext, useContext, type ReactNode } from "react";
import type { Plugin } from "@puckeditor/core";
import { Sparkles } from "lucide-react";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import {
  PuckAiBar,
  type AiProposal,
} from "@/components/editor/puck/PuckAiBar";

export type PuckAiPanelProps = {
  locale: Locale;
  websiteId: string;
  config: WebsiteConfig;
  version: number;
  localRevision: number;
  onApplyProposal: (
    proposal: AiProposal,
  ) =>
    | boolean
    | { ok: boolean; reason?: "stale" | "rejected" | "error"; message?: string }
    | Promise<
        | boolean
        | {
            ok: boolean;
            reason?: "stale" | "rejected" | "error";
            message?: string;
          }
      >;
};

const PuckAiPanelContext = createContext<PuckAiPanelProps | null>(null);

export function PuckAiPanelProvider({
  value,
  children,
}: {
  value: PuckAiPanelProps;
  children: ReactNode;
}) {
  return (
    <PuckAiPanelContext.Provider value={value}>
      {children}
    </PuckAiPanelContext.Provider>
  );
}

function PuckAiPluginPanel() {
  const props = useContext(PuckAiPanelContext);
  if (!props) {
    return (
      <div className="p-4 text-xs text-zinc-500">
        AI panel is unavailable.
      </div>
    );
  }
  return <PuckAiBar {...props} layout="sidebar" />;
}

/** Left-rail plugin — appears beside Blocks / Outline. */
export function createPuckAiPlugin(label: string): Plugin {
  return {
    name: "ai",
    label,
    icon: <Sparkles size={16} />,
    render: () => <PuckAiPluginPanel />,
  };
}
