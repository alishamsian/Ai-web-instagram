"use client";

/**
 * Keeps the native Puck shell usable on phone / tablet:
 * - collapses sidebars on narrow viewports (Puck does this once; we re-apply on rotate)
 * - opens the fields bottom-sheet when a block is selected on phone
 * - defaults the canvas device viewport to match the host screen
 */

import { useEffect, useRef } from "react";
import { usePuck } from "@puckeditor/core";

const PHONE = "(max-width: 637px)";
const TABLET = "(min-width: 638px) and (max-width: 989px)";

function hostDeviceWidth(width: number): number {
  if (width <= 480) return 390;
  if (width <= 900) return 768;
  return 1440;
}

export function PuckResponsiveChrome() {
  const { dispatch, appState, selectedItem } = usePuck();
  const lastBucket = useRef<"phone" | "tablet" | "desktop" | null>(null);
  const didInitViewport = useRef(false);

  useEffect(() => {
    const phoneMq = window.matchMedia(PHONE);
    const tabletMq = window.matchMedia(TABLET);

    const apply = () => {
      const phone = phoneMq.matches;
      const tablet = tabletMq.matches;
      const bucket = phone ? "phone" : tablet ? "tablet" : "desktop";

      if (!didInitViewport.current) {
        didInitViewport.current = true;
        const w = hostDeviceWidth(window.innerWidth);
        const current = appState.ui.viewports.current.width;
        if (current !== w) {
          dispatch({
            type: "setUi",
            ui: {
              viewports: {
                ...appState.ui.viewports,
                current: { width: w, height: "auto" },
              },
            },
          });
        }
      }

      if (lastBucket.current === bucket) return;
      lastBucket.current = bucket;

      if (phone) {
        dispatch({
          type: "setUi",
          ui: {
            leftSideBarVisible: false,
            rightSideBarVisible: false,
          },
        });
      } else if (tablet) {
        // One sidebar at a time — keep canvas readable.
        dispatch({
          type: "setUi",
          ui: {
            leftSideBarVisible: false,
            rightSideBarVisible: true,
          },
        });
      } else {
        dispatch({
          type: "setUi",
          ui: {
            leftSideBarVisible: true,
            rightSideBarVisible: true,
          },
        });
      }
    };

    apply();
    phoneMq.addEventListener("change", apply);
    tabletMq.addEventListener("change", apply);
    return () => {
      phoneMq.removeEventListener("change", apply);
      tabletMq.removeEventListener("change", apply);
    };
    // Intentionally once on mount + media changes; appState read only for init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Phone: selecting a block opens the Fields plugin as a bottom sheet.
  useEffect(() => {
    if (!window.matchMedia(PHONE).matches) return;
    if (!selectedItem) return;
    dispatch({
      type: "setUi",
      ui: {
        plugin: { current: "fields" },
        leftSideBarVisible: true,
        rightSideBarVisible: false,
        mobilePanelExpanded: true,
      },
    });
  }, [selectedItem, dispatch]);

  return null;
}
