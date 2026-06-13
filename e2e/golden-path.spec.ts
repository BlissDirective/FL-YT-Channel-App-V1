import { test, expect } from "@playwright/test";

/**
 * Golden-path smoke tests (Phase 10). These run with no credentials, so they
 * cover the surface reachable without a session: the styleguide (proves the
 * whole design-system + build render), the login screen, the auth gate, and
 * the PWA manifest. Authenticated pipeline flows are validated by hand via
 * docs/VALIDATION.md (they require a real Supabase session + provider keys).
 */

test("styleguide renders the component library", async ({ page }) => {
  await page.goto("/styleguide");
  await expect(page).toHaveURL(/\/styleguide/);
  // A real build renders headings + sample data; assert the page is alive.
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/Faceless Studio/i);
});

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
