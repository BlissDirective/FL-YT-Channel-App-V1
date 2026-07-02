import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Some src modules are server-only; the guard is meaningless under vitest.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@studio/core": path.resolve(__dirname, "packages/core/src"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
