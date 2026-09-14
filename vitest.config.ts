import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws in non-RSC bundlers; tests run in Node.
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});
