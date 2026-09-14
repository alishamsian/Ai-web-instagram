# Editor Architecture (P6)

Related: [Instagram Import Foundation](./import.md)

## Source of truth

```text
WebsiteConfig  →  StoreRenderer (mode: editor | preview | published)
```

Ephemeral UI state (selection, open panels, viewport) is **never** serialized into published WebsiteConfig.

## Core modules (`lib/editor`)

| Module | Role |
|--------|------|
| `types.ts` | Editor state shapes, history entries |
| `history.ts` | Labeled undo/redo stack (limit 40) |
| `commands.ts` | Pure WebsiteConfig mutations |
| `actions.ts` | Constrained `EditorAction` applicator |
| `responsive.ts` | Inherit / override / reset helpers |
| `validation.ts` | Publish preflight |
| `quality.ts` | Explainable quality score |
| `ai.ts` | Deterministic AI → EditorAction proposals |
| `keyboard.ts` | Shortcut map (⌘K, undo/redo, …) |
| `viewport.ts` | 390…1920 presets |

## Mutation flow

```text
UI / SchemaInspector / Command Palette / AI
        ↓
applyEditorAction | command*
        ↓
EditorShell.applyConfig(next, label)
        ↓
debounced history push
        ↓
autosave PATCH /api/websites/:id
        ↓
WebsiteRenderer → StoreRenderer
```

## Adding an Editor-aware section

1. Register section in Section Registry (`definitions` / vertical-definitions)
2. Bind renderer via `registerSectionRenderer`
3. Provide Element Schema for Inspector fields
4. Optionally set `dataRequirements` so P5/P6 can omit empty sections
5. Section Library discovers it automatically — do **not** hardcode a parallel catalog

## AI boundary

AI may only emit `EditorAction` values. Product identity, prices, and inventory paths are rejected.

## Publish

`runPublishPreflight(config)` — errors block publish in the dialog; warnings are advisory.
