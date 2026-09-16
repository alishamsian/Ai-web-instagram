# Puck Phase 5 — Demo chrome + Classic parity

## Goal

Make `/[locale]/editor/[websiteId]/puck` feel like the **official Puck demo**
(native layout: Blocks / Outline / Fields, drag overlays, sidebars) while
keeping Classic product surfaces via overrides — without a second WebsiteConfig
or deleting Classic.

## Layout strategy

Use **Puck’s default UI** (do not replace children with a custom three-pane shell).

| Layer | Source |
| --- | --- |
| Left rail Blocks / Outline | Built-in Puck plugins |
| Canvas DnD / overlays | Built-in Puck |
| Right Fields | Override → Classic Content/Brand/Media/SEO/Site + schema + Puck fields |
| Header actions | Override → Save / Publish / History / Quality / Preview / Classic |
| Shell wrap | Override `puck` → EditBridge + AI bar + dialogs |

## Source of truth

Still `WebsiteConfig`. Puck Data remains a projection.

## Classic

`/[locale]/editor/[websiteId]` is untouched.
