/**
 * Puck integration types.
 * WebsiteConfig remains the canonical product model.
 * Puck Data is an editing-surface projection only.
 */

import type { Data } from "@puckeditor/core";
import type {
  WebsiteConfig,
  WebsiteSectionType,
  SectionConfig,
} from "@/types/website";

/** Sidecar carried on Puck root so round-trip never drops site-level data. */
export type PuckRootProps = {
  template: WebsiteConfig["template"];
  brand: WebsiteConfig["brand"];
  /** Dual-model content bag (hero, products, FAQ, …) */
  content: WebsiteConfig["content"];
  seo: WebsiteConfig["seo"];
  settings: WebsiteConfig["settings"];
  media: WebsiteConfig["media"];
  /** Adapter format version for future migrations */
  adapterVersion: 1;
};

/** Props every mapped section carries inside Puck. */
export type PuckSectionProps = {
  /** Puck instance id — kept equal to SectionConfig.id */
  id: string;
  /** Explicit copy of section id for safety if Puck regenerates ids */
  sectionId: string;
  sectionType: WebsiteSectionType;
  visible: boolean;
  variant: string;
  settings: Record<string, unknown>;
};

export type PuckWebsiteData = Data;

export type AdapterDiff = {
  ok: boolean;
  lostSectionIds: string[];
  addedSectionIds: string[];
  orderChanged: boolean;
  rootFieldsEqual: boolean;
  messages: string[];
};

export type { SectionConfig, WebsiteConfig, WebsiteSectionType };
