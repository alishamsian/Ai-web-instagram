/**
 * Visual Editor — device / zoom conventions aligned with Classic editor.
 */

export type VisualDeviceId = "desktop" | "tablet" | "mobile";

export const VISUAL_DEVICES: {
  id: VisualDeviceId;
  grapesName: string;
  width: string;
  widthMedia?: string;
  label: { fa: string; en: string };
  px: number;
}[] = [
  {
    id: "desktop",
    grapesName: "Desktop",
    width: "",
    label: { fa: "دسکتاپ", en: "Desktop" },
    px: 1440,
  },
  {
    id: "tablet",
    grapesName: "Tablet",
    width: "768px",
    widthMedia: "992px",
    label: { fa: "تبلت", en: "Tablet" },
    px: 768,
  },
  {
    id: "mobile",
    grapesName: "Mobile",
    width: "390px",
    widthMedia: "480px",
    label: { fa: "موبایل", en: "Mobile" },
    px: 390,
  },
];

export type VisualZoomMode = 50 | 75 | 100 | 125 | 150 | "fit";

export const VISUAL_ZOOM_OPTIONS: VisualZoomMode[] = [
  50,
  75,
  100,
  125,
  150,
  "fit",
];

export function zoomToScale(zoom: VisualZoomMode): number {
  if (zoom === "fit") return 1;
  return zoom / 100;
}
