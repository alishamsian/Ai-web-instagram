import type { EditorDevice, EditorViewportId } from "@/lib/editor/types";

export const EDITOR_VIEWPORT_PRESETS: {
  id: EditorViewportId;
  width: number;
  device: EditorDevice;
  label: { fa: string; en: string };
}[] = [
  { id: "390", width: 390, device: "mobile", label: { fa: "موبایل ۳۹۰", en: "Mobile 390" } },
  { id: "430", width: 430, device: "mobile", label: { fa: "موبایل ۴۳۰", en: "Mobile 430" } },
  { id: "768", width: 768, device: "tablet", label: { fa: "تبلت ۷۶۸", en: "Tablet 768" } },
  { id: "1024", width: 1024, device: "tablet", label: { fa: "تبلت ۱۰۲۴", en: "Tablet 1024" } },
  { id: "1280", width: 1280, device: "desktop", label: { fa: "دسکتاپ ۱۲۸۰", en: "Desktop 1280" } },
  { id: "1440", width: 1440, device: "desktop", label: { fa: "دسکتاپ ۱۴۴۰", en: "Desktop 1440" } },
  { id: "1920", width: 1920, device: "desktop", label: { fa: "دسکتاپ ۱۹۲۰", en: "Desktop 1920" } },
];

export function viewportWidth(
  id: EditorViewportId,
  customWidth = 1280,
): number {
  if (id === "custom") {
    return Math.min(1920, Math.max(320, customWidth));
  }
  const preset = EDITOR_VIEWPORT_PRESETS.find((p) => p.id === id);
  return preset?.width ?? 1280;
}

export function deviceFromViewport(id: EditorViewportId): EditorDevice {
  if (id === "custom") return "desktop";
  return (
    EDITOR_VIEWPORT_PRESETS.find((p) => p.id === id)?.device ?? "desktop"
  );
}

export function viewportFromDevice(device: EditorDevice): EditorViewportId {
  if (device === "mobile") return "390";
  if (device === "tablet") return "768";
  return "1280";
}
