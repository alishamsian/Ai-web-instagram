"use client";

/**
 * Columns layout — dual Puck slots for two-column composition.
 */

import type { ComponentConfig } from "@puckeditor/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sectionPresentationProps } from "@/lib/store/section-presentation";

type SlotRender = (props?: {
  allow?: string[];
  disallow?: string[];
  className?: string;
  minEmptyHeight?: string | number;
}) => ReactNode;

export function buildColumnsComponent(locale: "fa" | "en"): ComponentConfig {
  return {
    label: locale === "fa" ? "دو ستون" : "Columns",
    defaultProps: {
      id: "columns-new",
      sectionId: "columns-new",
      sectionType: "columns",
      visible: true,
      variant: "",
      settings: {},
      left: [],
      right: [],
      gap: "comfortable",
      ratio: "1-1",
    },
    fields: {
      visible: {
        type: "radio",
        label: locale === "fa" ? "نمایش" : "Visibility",
        options: [
          { label: locale === "fa" ? "نمایان" : "Visible", value: true },
          { label: locale === "fa" ? "مخفی" : "Hidden", value: false },
        ],
      },
      gap: {
        type: "select",
        label: locale === "fa" ? "فاصله" : "Gap",
        options: [
          { label: locale === "fa" ? "فشرده" : "Tight", value: "tight" },
          {
            label: locale === "fa" ? "متعادل" : "Comfortable",
            value: "comfortable",
          },
          { label: locale === "fa" ? "باز" : "Spacious", value: "spacious" },
        ],
      },
      ratio: {
        type: "select",
        label: locale === "fa" ? "نسبت" : "Ratio",
        options: [
          { label: "1 : 1", value: "1-1" },
          { label: "1 : 2", value: "1-2" },
          { label: "2 : 1", value: "2-1" },
        ],
      },
      left: {
        type: "slot",
        label: locale === "fa" ? "ستون چپ" : "Left column",
        disallow: ["columns", "footer"],
      },
      right: {
        type: "slot",
        label: locale === "fa" ? "ستون راست" : "Right column",
        disallow: ["columns", "footer"],
      },
    },
    resolvePermissions: async () => ({
      delete: true,
      duplicate: true,
      drag: true,
      insert: true,
      edit: true,
    }),
    resolveData: async (data: { props: Record<string, unknown> }) => ({
      props: {
        ...data.props,
        sectionType: "columns",
        sectionId:
          (data.props.sectionId as string) || (data.props.id as string),
      },
    }),
    render: (rawProps: Record<string, unknown>) => {
      const Left = rawProps.left as SlotRender;
      const Right = rawProps.right as SlotRender;
      const gapValue = (rawProps.gap as string) || "comfortable";
      const ratioValue = (rawProps.ratio as string) || "1-1";
      const visible = rawProps.visible !== false;
      const settings = (rawProps.settings as Record<string, unknown>) ?? {};
      const mergedSettings = {
        ...settings,
        gap: gapValue,
        ratio: ratioValue,
      };
      return (
        <div
          className={cn(
            "store-columns store-section-present",
            !visible && "opacity-40 grayscale",
          )}
          data-gap={gapValue}
          data-ratio={ratioValue}
          {...sectionPresentationProps(mergedSettings)}
        >
          <div className="store-columns__grid">
            <div className="store-columns__col">
              {typeof Left === "function" ? (
                <Left
                  disallow={["columns", "footer"]}
                  className="store-columns__slot"
                  minEmptyHeight={120}
                />
              ) : null}
            </div>
            <div className="store-columns__col">
              {typeof Right === "function" ? (
                <Right
                  disallow={["columns", "footer"]}
                  className="store-columns__slot"
                  minEmptyHeight={120}
                />
              ) : null}
            </div>
          </div>
        </div>
      );
    },
  } as unknown as ComponentConfig;
}
