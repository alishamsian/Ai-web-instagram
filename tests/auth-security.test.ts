import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "@/lib/auth/password";
import { safeAuthNext } from "@/lib/auth/redirect";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

describe("auth password rules", () => {
  it("rejects short or letter-only passwords", () => {
    expect(validatePasswordStrength("short1").ok).toBe(false);
    expect(validatePasswordStrength("onlyletters").ok).toBe(false);
    expect(validatePasswordStrength("1234567890").ok).toBe(false);
  });

  it("accepts an 8-character strong password", () => {
    expect(validatePasswordStrength("Pass1234").ok).toBe(true);
  });

  it("rejects password containing email local-part", () => {
    expect(validatePasswordStrength("ali1234567", "ali@vitrin.app").ok).toBe(
      false,
    );
  });
});

describe("safeAuthNext", () => {
  it("blocks open redirects", () => {
    expect(safeAuthNext("//evil.com", "fa")).toBe("/fa/dashboard");
    expect(safeAuthNext("https://evil.com", "fa")).toBe("/fa/dashboard");
    expect(safeAuthNext("/fa/editor/x", "fa")).toBe("/fa/editor/x");
    expect(safeAuthNext("/fa/reset-password", "fa")).toBe("/fa/reset-password");
  });
});

describe("rate limit", () => {
  it("blocks after the configured limit", () => {
    const key = `test:${Date.now()}`;
    expect(consumeRateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(consumeRateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(consumeRateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(false);
  });
});
