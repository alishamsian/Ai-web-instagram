# Instagram Import Foundation

## Pipeline

```
Instagram username/URL
        ↓
InstagramProvider.importProfile()   (Apify | Mock)
        ↓
normalizeInstagramImport()          (raw → InstagramImport)
        ↓
buildWebsiteConfigFromInstagram()   (optional AI analysis → WebsiteConfig)
        ↓
Existing EditorShell                (/{locale}/editor/{websiteId})
```

AI is **optional**. If analysis fails or is omitted, `heuristicAnalysisFromImport()` builds a deterministic analysis (no invented product names).

## Domain model

Canonical types live in `types/instagram.ts`:

- `InstagramProfile` / `InstagramPost` / `InstagramMedia` / `InstagramImport`
- Collector: `InstagramCollector` (low-level scrape API)
- Product boundary: `InstagramProvider` in `lib/instagram/provider.ts`
- UI-oriented statuses: `ImportPipelineStatus` (`idle` | `fetching` | `normalizing` | `ready` | `failed`)

Job orchestration still uses richer `ImportJob` statuses in `types/jobs.ts`.

## Key modules

| Module | Role |
|---|---|
| `lib/instagram/provider.ts` | Provider boundary |
| `lib/instagram/normalizer.ts` | Raw provider fields → typed profile/posts |
| `lib/instagram/media.ts` | Safe media list (http(s), dedupe, alt) |
| `lib/instagram/pipeline.ts` | `normalizeInstagramImport`, heuristic analysis |
| `lib/instagram/merger.ts` | Assemble `InstagramImport` |
| `lib/website/generator.ts` | `buildWebsiteConfigFromInstagram` → existing `WebsiteConfig` |
| `lib/jobs/import-job.ts` | Async job: scrape → persist media → analyze → website → editor |

## WebsiteConfig mapping

Uses the **existing** config only:

- display name → `brand.name` / hero
- bio → tagline / about / SEO description
- avatar + posts → `media` map + gallery / feed sections
- external URL → contact
- sections from recipe / vertical pipeline (not a new catalog)

`WebsiteRecord.importId` is preserved.

## Plugging in a real approved provider

1. Implement `InstagramCollector` (or wrap with `createInstagramProviderFromCollector`).
2. Wire selection in `getInstagramCollector()` / `getInstagramProvider()`.
3. Keep returning raw objects that `normalizeProfile` / `normalizePost` understand — never leak raw provider JSON into the editor.

Do **not** scrape Instagram HTML in the browser. Do **not** expose API tokens to the client.

## V1 limitations

- Real Instagram access requires Apify (`APIFY_API_TOKEN`) or demo/mock profiles.
- Private / missing / rate-limited profiles fail with typed `CollectorError` / job error codes.
- Media is hosted when storage is configured; otherwise development may use external URLs until persist runs.
- AI analysis improves copy/products when configured; the site still builds without it.
