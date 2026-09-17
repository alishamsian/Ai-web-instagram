"use client";

/** Light breakpoint helpers — do not fight Puck's own mobile layout. */

import { useEffect, useRef } from "react";
import { usePuck } from "@puckeditor/core";

const PHONE = "(max-width: 637px)";

export function PuckResponsiveChrome() {
  const { dispatch, selectedItem } = usePuck();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    // Match demo: start with Small viewport on phones so canvas controls make sense.
    if (window.matchMedia(PHONE).matches) {
      dispatch({
        type: "setUi",
        ui: {
          leftSideBarVisible: false,
          rightSideBarVisible: false,
        },
      });
      dispatch({
        type: "setUi",
        ui: (ui) => ({
          ...ui,
          viewports: {
            ...ui.viewports,
            current: { width: 360, height: "auto" as const },
          },
        }),
      });
    }
  }, [dispatch]);

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
