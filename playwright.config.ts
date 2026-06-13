import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E (Phase 10). Smoke-tests the golden path's public surface —
 * the styleguide (the whole component library), the login screen, the auth
 * redirect, and the PWA manifest — against a real production build. Runs with
 * no secrets: auth-gated routes are asserted to redirect, not entered.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
