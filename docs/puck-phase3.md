# Puck Phase 3 — AI Co-Designer

## Architecture

```text
User prompt (PuckAiBar)
  → POST /api/websites/[id]/ai/co-design  (server-only)
  → Deterministic route (lib/editor/ai/intents) OR LLM (OpenAI-compatible)
  → EditorAction[]
  → validateEditorActions (dry-run applyEditorAction)
  → Proposal UI (preview summaries)
  → User Apply
  → executeAiActionBatch → ONE history entry ("AI Edit: …")
  → WebsiteConfig → websiteConfigToPuck → canvas
  → existing autosave PATCH
```

`WebsiteConfig` remains the source of truth. AI never emits HTML/CSS/JS.

## Action model

Reuse **`EditorAction`** (extended Phase 3 with `setSectionVariant`, `patchSectionSettings`).

No parallel `EditorAiOperation` mutation model.

## Deterministic vs LLM

| Path | When | Cost |
| --- | --- | --- |
| Deterministic `proposeEditorActions` | restyle, shorten hero, improve CTA, black buttons, hide/show selected, mobile tighten, … | $0 |
| LLM | no safe deterministic match AND `AI_API_KEY` configured | metered via `recordAiUsage` (`editor_co_design`) |
| Mock | `ALLOW_MOCK` without key | safe restyle editorial demo |

## Validation / safety

- `isProductProtectedAction` blocks product item / price mutations
- `applyEditorAction` enforces protected paths, color format, SEO claims
- LLM `setSchemaValue` / `applyTemplate` rejected at parse time
- Unknown section types cannot be invented via `addSection`
- Variants must be registry-supported
- Cancel on proposal = zero mutation

## History

Application stack: `lib/editor/history` inside `PuckEditorShell`.

- Manual edits → debounced `"Edit"` or discrete labels
- AI Apply → single `"AI Edit: …"` transaction (Undo restores all actions)
- Top bar / ⌘Z use this stack (not fighting Puck’s internal history)

## Persistence

Unchanged: debounced `PATCH /api/websites/[id]` with `expectedVersion`.  
409 → user-facing refresh message (FA/EN).

## Security

- LLM calls server-side only (`AI_API_KEY` never sent to client)
- Compact context (`buildAiEditorContext`) omits secrets, auth, payment, product prices
- Propose endpoint does not write config; client applies after validation

## Limitations

- Streaming tokens not implemented (phase returns full JSON proposal)
- LLM quality depends on provider model / key
- Mid-drag Puck internal history is not merged into the app stack
- Business price edits remain intentionally blocked

## Classic editor

Intact. Deterministic `proposeEditorActions` still powers classic restyle event.
