import { describe, expect, it } from "vitest";
import {
  VISUAL_PRESETS,
  isVisualPresetDistinct,
  validateVisualPresetCatalog,
} from "@/lib/design-system/visual-presets";

describe("visual preset catalog", () => {
  it("contains only unique, intentionally distinct directions", () => {
    expect(validateVisualPresetCatalog().ok).toBe(true);
    expect(new Set(VISUAL_PRESETS.map((preset) => preset.id)).size).toBe(VISUAL_PRESETS.length);
    for (let i = 0; i < VISUAL_PRESETS.length; i += 1) {
      for (let j = i + 1; j < VISUAL_PRESETS.length; j += 1) {
        expect(isVisualPresetDistinct(VISUAL_PRESETS[i], VISUAL_PRESETS[j])).toBe(true);
      }
    }
  });

  it("requires responsive and future dark-mode contracts", () => {
    for (const preset of VISUAL_PRESETS) {
      expect(preset.responsive.mobile).toBeTruthy();
      expect(preset.responsive.tablet).toBeTruthy();
      expect(preset.responsive.desktop).toBeTruthy();
      expect(preset.theme.supportsDark).toBe(true);
      expect(preset.theme.semanticTokens).toBe(true);
    }
  });
});
