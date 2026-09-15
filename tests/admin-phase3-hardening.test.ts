import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Admin Phase 3 hardening", () => {
  it("enforces max attempts before retrying an import job", () => {
    const src = read("lib/admin/phase3-actions.ts");
    expect(src).toMatch(/maxAttempts/);
    expect(src).toMatch(/retryCount >= maxAttempts/);
    expect(src).toMatch(/maximum retry attempts/);
  });

  it("uses a conditional failed-state update to reduce retry races", () => {
    const src = read("lib/admin/phase3-actions.ts");
    expect(src).toMatch(/\.eq\("status", "failed"\)/);
    expect(src).toMatch(/CONFLICT/);
    expect(src).toMatch(/Job changed before retry could be applied/);
  });
});
