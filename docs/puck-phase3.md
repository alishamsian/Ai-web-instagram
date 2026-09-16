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

---

## Phase 3.1 Hardening

### Server-authoritative AI context

- Canonical config is loaded from the database via `getWebsiteForWorkspace`.
- Full client `WebsiteConfig` is **ignored** (never trusted).
- Optional `draftHints` overlay only allowlisted content paths + brand colors via existing commands.
- Propose endpoint never persists config.

### Selection-aware routing

Precedence: explicit section mention → selected section type → generic → deterministic only if unambiguous → else LLM/clarify.

`"کوتاه‌ترش کن"` with Services selected does **not** run `shorten_hero`.

### Proposal version protection

- Each proposal stores `baseVersion` (server) + `localRevision` (client).
- Apply uses `assertProposalFresh` — stale manual edits / version conflicts reject Apply.
- Propose / Cancel do not mutate WebsiteConfig.

### Action validation

- Stronger checks in `applyEditorAction`: section existence, preset registry, settings allowlist (scalars only), fabricated claims, SEO length/HTML, reorder bounds, unknown section types.

### Product / business protection

- Product items, prices, SKU/inventory settings patches rejected.
- Fabricated social proof / awards rejected in content and SEO.

### Security boundaries

- Auth + workspace ownership required.
- Stable error codes (`UNAUTHORIZED`, `VERSION_CONFLICT`, `AI_ACTION_REJECTED`, …).
- No API keys / raw provider errors in UI.

### Persistence / versioning

Still `PATCH /api/websites/[id]` with `expectedVersion`. No second save system.

### History behavior

One AI Apply = one `"AI Edit: …"` history entry. Undo/redo restores the full batch.

### Puck native internal history

**Puck native internal history is not fully merged with application history.**

App-level `lib/editor/history` owns AI + WebsiteConfig undo. Puck may keep transient DnD internals separately.

### Test coverage

`tests/puck-ai-phase31.test.ts` — routing, draft authority, freshness races, product protection, history transaction, edge cases.

### Known limitations

- No token streaming.
- LLM path still depends on `AI_API_KEY`.
- Unsaved *structural* section order is not fully represented in draftHints (content/brand only).
- Puck native history remains unmerged (documented above).
