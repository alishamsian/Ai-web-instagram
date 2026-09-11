"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketingTheme = "dark" | "light";

const STORAGE_KEY = "vitrin-marketing-theme";

type MarketingThemeContextValue = {
  theme: MarketingTheme;
  setTheme: (theme: MarketingTheme) => void;
  toggle: () => void;
};

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(
  null,
);

function readStoredTheme(): MarketingTheme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MarketingTheme>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setThemeState(readStoredTheme());
    setReady(true);
  }, []);

  const setTheme = useCallback((next: MarketingTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return (
    <MarketingThemeContext.Provider value={{ theme, setTheme, toggle }}>
      <div
        className="marketing"
        data-theme={theme}
        data-theme-ready={ready ? "true" : "false"}
        suppressHydrationWarning
      >
        {children}
      </div>
    </MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    // App pages (create/sites/…) use Navbar outside the marketing shell.
    return {
      theme: "light" as const,
      setTheme: () => undefined,
      toggle: () => undefined,
      scoped: false as const,
    };
  }
  return { ...ctx, scoped: true as const };
}

export function MarketingThemeToggle({
  className,
  labels,
}: {
  className?: string;
  labels: { dark: string; light: string };
}) {
  const { theme, setTheme } = useMarketingTheme();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-background-elevated/80 p-0.5 shadow-[var(--elevated)]",
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title={labels.dark}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors",
          theme === "dark"
            ? "bg-accent text-accent-foreground"
            : "text-foreground-muted hover:text-foreground",
        )}
      >
        <Moon size={14} aria-hidden />
        <span className="sr-only">{labels.dark}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title={labels.light}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors",
          theme === "light"
            ? "bg-accent text-accent-foreground"
            : "text-foreground-muted hover:text-foreground",
        )}
      >
        <Sun size={14} aria-hidden />
        <span className="sr-only">{labels.light}</span>
      </button>
    </div>
  );
}
