"use client";

/**
 * Parallel Puck editor shell — Phase 1 foundation.
 * Does NOT replace EditorShell. Classic editor remains the default route.
 *
 * Persistence: same PATCH /api/websites/[id] + WebsiteConfig.
 * AI / templates / WebsiteRenderer contracts unchanged.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { WebsiteRecord } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  buildPuckConfig,
  puckToWebsiteConfig,
  websiteConfigToPuck,
  type PuckWebsiteData,
} from "@/lib/puck";
import { PuckWebsiteProvider } from "@/lib/puck/website-context";
import { PuckFallbackBanner } from "@/components/editor/puck/PuckFallbackBanner";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { cn } from "@/lib/utils";

ensureStoreSectionRenderersBound();

const AUTOSAVE_MS = 900;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function PuckEditorShell({
  website,
  locale,
}: {
  website: WebsiteRecord;
  locale: Locale;
  plan?: string;
}) {
  const isFa = locale === "fa";
  const [config, setConfig] = useState(website.config);
  const [version, setVersion] = useState(website.version);
  const [puckData, setPuckData] = useState<PuckWebsiteData>(() =>
    websiteConfigToPuck(website.config),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const configRef = useRef(config);
  const versionRef = useRef(version);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const puckConfig = useMemo(
    () =>
      buildPuckConfig({
        vertical: config.settings.vertical,
        locale,
      }),
    [config.settings.vertical, locale],
  );

  const persist = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configRef.current,
          expectedVersion: versionRef.current,
        }),
      });
      if (res.status === 409) {
        setSaveState("error");
        setErrorMessage(
          isFa
            ? "تداخل نسخه — صفحه را رفرش کنید."
            : "Version conflict — please refresh.",
        );
        dirtyRef.current = true;
        return;
      }
      if (!res.ok) {
        setSaveState("error");
        setErrorMessage(isFa ? "ذخیره ناموفق بود." : "Save failed.");
        dirtyRef.current = true;
        return;
      }
      const body = (await res.json()) as { version?: number };
      if (typeof body.version === "number") {
        setVersion(body.version);
        versionRef.current = body.version;
      }
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setErrorMessage(isFa ? "خطای شبکه هنگام ذخیره." : "Network error while saving.");
      dirtyRef.current = true;
    } finally {
      savingRef.current = false;
    }
  }, [website.id, isFa]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, AUTOSAVE_MS);
  }, [persist]);

  useEffect(() => {
    const onPageHide = () => {
      if (!dirtyRef.current) return;
      void fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configRef.current,
          expectedVersion: versionRef.current,
        }),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [website.id]);

  const handleChange = useCallback(
    (data: PuckWebsiteData) => {
      setPuckData(data);
      const next = puckToWebsiteConfig(data, configRef.current);
      setConfig(next);
      scheduleSave();
    },
    [scheduleSave],
  );

  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";

  return (
    <div className="flex h-dvh flex-col bg-[#f4f4f5]" dir={dir}>
      <PuckFallbackBanner locale={locale} websiteId={website.id} />
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {config.brand.name || website.slug}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isFa ? "ویرایشگر Puck · فاز ۱" : "Puck editor · Phase 1"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              saveState === "saved" && "bg-emerald-50 text-emerald-800",
              saveState === "saving" && "bg-sky-50 text-sky-800",
              saveState === "dirty" && "bg-amber-50 text-amber-900",
              saveState === "error" && "bg-red-50 text-red-800",
              saveState === "idle" && "bg-muted text-muted-foreground",
            )}
          >
            {saveState === "saved"
              ? isFa
                ? "ذخیره شد"
                : "Saved"
              : saveState === "saving"
                ? isFa
                  ? "در حال ذخیره…"
                  : "Saving…"
                : saveState === "dirty"
                  ? isFa
                    ? "تغییرات ذخیره‌نشده"
                    : "Unsaved"
                  : saveState === "error"
                    ? isFa
                      ? "خطا"
                      : "Error"
                    : isFa
                      ? "آماده"
                      : "Ready"}
          </span>
          <button
            type="button"
            onClick={() => void persist()}
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {isFa ? "ذخیره" : "Save"}
          </button>
          <Link
            href={`/${locale}/preview/${website.id}`}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {isFa ? "پیش‌نمایش" : "Preview"}
          </Link>
        </div>
      </header>
      {errorMessage ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
          {errorMessage}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <PuckWebsiteProvider config={config} locale={locale}>
          <Puck
            config={puckConfig}
            data={puckData}
            onChange={handleChange}
            headerTitle={config.brand.name || website.slug}
            height="100%"
            viewports={[
              { width: 1440, height: "auto", label: "Desktop" },
              { width: 768, height: "auto", label: "Tablet" },
              { width: 390, height: "auto", label: "Mobile" },
            ]}
          />
        </PuckWebsiteProvider>
      </div>
    </div>
  );
}
