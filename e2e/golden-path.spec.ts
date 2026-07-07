import { test, expect } from "@playwright/test";

/**
 * Golden-path smoke tests (Phase 10). These run with no credentials, so they
 * cover the surface reachable without a session: the login screen, the auth
 * gate, and the PWA manifest. Authenticated pipeline + UI flows (Library,
 * Asset Canvas, Autopilot, Feed) are covered by e2e/authed/* against a local
 * Supabase stack. (The styleguide route was removed post-launch.)
 */

test("login screen shows the email + password form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Faceless Studio/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("unauthenticated home redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("PWA manifest is served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.name ?? body.short_name).toBeTruthy();
});
