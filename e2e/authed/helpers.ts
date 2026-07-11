import { type Page } from "@playwright/test";

/** Shared credentials + login flow for the authed mock-mode suite. */
export const EMAIL = "operator@example.com";
export const PASSWORD = "golden-path-e2e";

/** Bootstrap on a fresh stack; fall back to sign-in on retries. */
export async function signInOrBootstrap(page: Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "First-time setup" }).click();
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create operator account" }).click();

  const alreadyExists = page.getByText("An account already exists");
  await Promise.race([
    page.waitForURL("/", { timeout: 30_000 }),
    alreadyExists.waitFor({ timeout: 30_000 }),
  ]);
  if (page.url().includes("/login")) {
    await page.getByRole("tab", { name: "Sign in" }).click();
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("/", { timeout: 30_000 });
  }
}
