/**
 * Lightweight mobile dashboard smoke checks — class contracts that keep
 * the shell usable at ~390px without a full Playwright install.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("mobile dashboard shell contracts", () => {
  it("hides desktop aside on small screens", () => {
    const layout = read("app/[locale]/dashboard/layout.tsx");
    expect(layout).toMatch(/aside className="[^"]*hidden[^"]*md:flex/);
  });

  it("exposes a mobile tab bar", () => {
    const tab = read("components/dashboard/MobileDashboardTabBar.tsx");
    expect(tab).toMatch(/md:hidden/);
    expect(tab).toMatch(/grid-cols-5/);
    expect(tab).toMatch(/safe-area-inset-bottom/);
  });

  it("keeps command palette reachable on phones", () => {
    const cmd = read("components/dashboard/CommandPalette.tsx");
    expect(cmd).toMatch(/inline-flex size-9/);
    expect(cmd).not.toMatch(/hidden h-9.*sm:inline-flex/);
  });

  it("uses proxy instead of deprecated middleware export", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toMatch(/export async function proxy/);
    expect(proxy).not.toMatch(/export async function middleware/);
  });
});
