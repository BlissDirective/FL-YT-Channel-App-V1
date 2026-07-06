/**
 * UI-Redesign Phase 0 — the authenticated mock-mode golden path.
 *
 * Drives one asset through the ENTIRE pipeline via the real UI against a
 * local Supabase stack (CI: `supabase start`), with every provider adapter
 * in mock mode (no credentials):
 *
 *   bootstrap account → create project (assist on all gates) → queue topic
 *   → IDEA gate approve → SCRIPT gate (edit a beat, approve) → assets
 *   generate → ASSETS gate approve → mock render completes in-app →
 *   FINAL gate approve → publish kit → mark as uploaded → TRACKING
 *
 * This is the characterization suite the redesign phases must keep green
 * (Fable-5-UI-Redesign.md Phase 0). From Phase 3 the same journey is ported
 * to the Library + Asset Canvas and BOTH runs must pass until Phase 7.
 *
 * Requires (set by the e2e-authed CI job, or a local `supabase start`):
 *   AUTHED_E2E=1, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY — the app must be BUILT with these env vars.
 */
import { expect, test, type Page } from "@playwright/test";

const EMAIL = "operator@example.com";
const PASSWORD = "golden-path-e2e";

// One asset takes ~10 mock stage-hops with QC reviews between; generous.
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

let projectUrl = ""; // captured in the golden path, reused for screenshots

/** Bootstrap on a fresh stack; fall back to sign-in on retries. */
async function signInOrBootstrap(page: Page) {
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

/** Approve the currently-open gate from the review queue; the card's
    "Approve & continue" runs the pipeline then routes to the video page. */
async function approveGateFromReview(page: Page, gateLabel: string) {
  await page.goto(`${projectUrl}/review`);
  await expect(page.getByText(`${gateLabel} gate`).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Approve & continue" }).first().click();
  // The server action runs QC + the next mock stage(s) before routing.
  await page.waitForURL(/\/videos\/[0-9a-f-]+/, { timeout: 120_000 });
}

test("golden path: idea → script → assets → render → publish → tracking", async ({
  page,
}) => {
  await test.step("bootstrap the operator account", async () => {
    await signInOrBootstrap(page);
    await expect(page.getByRole("link", { name: /New Project/ }).first()).toBeVisible();
  });

  await test.step("create a project with assist on every gate", async () => {
    await page.getByRole("link", { name: /New Project/ }).first().click();
    await page.waitForURL(/\/projects\/new/);
    // Unique name per attempt so CI retries never collide.
    await page.locator('input[name="name"]').fill(`Golden Path ${Date.now()}`);
    await page.locator('input[name="niche"]').fill("Software testing");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Continue" }).click();
    }
    // Wizard defaults: assist on all four gates — the human drives every gate.
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]+$/, { timeout: 60_000 });
    projectUrl = new URL(page.url()).pathname;
  });

  await test.step("queue a topic → asset is born at the IDEA gate", async () => {
    await page
      .locator('input[placeholder^="Type a video topic"]')
      .fill("Why every pipeline needs a golden-path test");
    await page.getByRole("button", { name: "Queue topic" }).click();
    await page.waitForURL(/\/review$/, { timeout: 60_000 });
    await expect(page.getByText("Idea gate").first()).toBeVisible({ timeout: 30_000 });
  });

  await test.step("approve IDEA → mock scripting runs → SCRIPT gate", async () => {
    await page.getByRole("button", { name: "Approve & continue" }).first().click();
    await page.waitForURL(/\/videos\/[0-9a-f-]+/, { timeout: 120_000 });
  });

  await test.step("edit a beat on the video page (script stays editable)", async () => {
    const editButton = page.getByRole("button", { name: "Edit", exact: true }).first();
    await expect(editButton).toBeVisible({ timeout: 30_000 });
    await editButton.click();
    const beatBox = page.locator("textarea").first();
    await beatBox.fill("Golden-path beat, edited by the Phase 0 harness.");
    await page.getByRole("button", { name: /^Save/ }).first().click();
    await expect(
      page.getByText("Golden-path beat, edited by the Phase 0 harness."),
    ).toBeVisible({ timeout: 30_000 });
  });

  await test.step("approve SCRIPT → mock assets generate → ASSETS gate", async () => {
    await approveGateFromReview(page, "Script");
  });

  await test.step("approve ASSETS → mock render completes in-app → FINAL gate", async () => {
    await approveGateFromReview(page, "Assets");
  });

  await test.step("approve FINAL → APPROVED, publish kit is live", async () => {
    await approveGateFromReview(page, "Final cut");
    await expect(page.getByText("Already uploaded it?")).toBeVisible({
      timeout: 30_000,
    });
  });

  await test.step("mark as uploaded → TRACKING with a stats panel", async () => {
    await page
      .locator('input[placeholder="https://youtu.be/…"]')
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Mark as uploaded" }).click();
    await expect(page.getByText("Tracking").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Refresh stats" })).toBeVisible();
  });
});

test("baseline screenshots of the main authenticated routes", async ({ page }, testInfo) => {
  await signInOrBootstrap(page);
  const routes: [string, string][] = [
    ["home", "/"],
    ["insights", "/insights"],
    ["intel", "/intel"],
    ["costs", "/costs"],
    ["settings", "/settings"],
    ["styleguide", "/styleguide"],
    ["project", projectUrl || "/"],
    ["review", projectUrl ? `${projectUrl}/review` : "/"],
  ];
  for (const [name, route] of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const path = testInfo.outputPath(`baseline-${name}.png`);
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`baseline-${name}`, { path, contentType: "image/png" });
  }
});
