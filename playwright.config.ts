import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E (Phase 10 + UI-Redesign Phase 0).
 *
 * Two suites:
 *  - `chromium` — credential-free smoke of the public surface (styleguide,
 *    login, auth redirect, PWA manifest) against a production build.
 *  - `authed-chromium` — the authenticated mock-mode golden path
 *    (e2e/authed/*). Only registered when AUTHED_E2E=1: it needs a local
 *    Supabase stack and an app BUILT with its env (see the e2e-authed CI
 *    job in .github/workflows/e2e.yml).
 */
const AUTHED = process.env.AUTHED_E2E === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The authed golden path is one serial journey — a second worker would
  // only race the screenshots test against it.
  workers: AUTHED ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /authed\//,
    },
    ...(AUTHED
      ? [
          {
            name: "authed-chromium",
            use: { ...devices["Desktop Chrome"] },
            testMatch: /authed\/.*\.spec\.ts/,
          },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
