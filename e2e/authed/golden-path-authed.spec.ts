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

test("library v2: asset born in Ideas, quick-approved through sections, killable", async ({
  page,
}) => {
  await signInOrBootstrap(page);

  // Fresh project for isolation.
  await page.getByRole("link", { name: /New Project/ }).first().click();
  await page.waitForURL(/\/projects\/new/);
  await page.locator('input[name="name"]').fill(`Library v2 ${Date.now()}`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/, { timeout: 60_000 });
  const libUrl = `${new URL(page.url()).pathname}/library`;

  await test.step("new asset lands in the Ideas section, awaiting the operator", async () => {
    await page.goto(libUrl);
    await page
      .locator('input[placeholder^="Type a video topic"]')
      .fill("Library quick-action journey");
    await page.getByRole("button", { name: "New asset" }).click();
    await expect(page.getByRole("button", { name: /Ideas/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("asset-tile").first()).toBeVisible();
    await expect(page.getByText("your turn").first()).toBeVisible();
    await expect(page.getByText("Idea gate").first()).toBeVisible();
  });

  await test.step("collapse state persists across a reload", async () => {
    await page.getByRole("button", { name: /Ideas/ }).click();
    await expect(page.getByTestId("asset-tile")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: /Ideas/ })).toBeVisible();
    await expect(page.getByTestId("asset-tile")).toHaveCount(0);
    await page.getByRole("button", { name: /Ideas/ }).click();
    await expect(page.getByTestId("asset-tile").first()).toBeVisible();
  });

  await test.step("quick-approve moves the tile Ideas → Script → Production", async () => {
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByText("Script gate").first()).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByText("Assets gate").first()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole("button", { name: /Production/ })).toBeVisible();
  });

  await test.step("kill from the tile removes the asset (confirmed + audited)", async () => {
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Kill" }).click();
    await expect(page.getByTestId("asset-tile")).toHaveCount(0, { timeout: 30_000 });
  });
});

test("golden path v2: the same journey entirely on Library + Asset Canvas", async ({
  page,
}) => {
  await signInOrBootstrap(page);

  await page.getByRole("link", { name: /New Project/ }).first().click();
  await page.waitForURL(/\/projects\/new/);
  await page.locator('input[name="name"]').fill(`Canvas v2 ${Date.now()}`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/, { timeout: 60_000 });
  const libUrl = `${new URL(page.url()).pathname}/library`;

  await test.step("asset born from the Library, opened on the Canvas", async () => {
    await page.goto(libUrl);
    await page
      .locator('input[placeholder^="Type a video topic"]')
      .fill("Canvas contained-pipeline journey");
    await page.getByRole("button", { name: "New asset" }).click();
    await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 30_000 });
    await page.getByText("Canvas contained-pipeline journey").first().click();
    await page.waitForURL(/\/videos\/[0-9a-f-]+/);
    await expect(page.getByTestId("checkpoint-panel")).toBeVisible();
    await expect(page.getByText("Idea gate")).toBeVisible();
  });

  const approveCheckpoint = async (nextGate: string) => {
    await page
      .getByTestId("checkpoint-panel")
      .getByRole("button", { name: "Approve & continue" })
      .click();
    await expect(page.getByTestId("checkpoint-panel").getByText(nextGate)).toBeVisible({
      timeout: 120_000,
    });
  };

  await test.step("IDEA → SCRIPT on one page (progress rail advances)", async () => {
    await approveCheckpoint("Script gate");
  });

  await test.step("edit a beat in place at the Script checkpoint", async () => {
    const editButton = page.getByRole("button", { name: "Edit", exact: true }).first();
    await expect(editButton).toBeVisible({ timeout: 30_000 });
    await editButton.click();
    await page.locator("textarea").first().fill("Canvas beat, edited at the checkpoint.");
    await page.getByRole("button", { name: /^Save/ }).first().click();
    await expect(page.getByText("Canvas beat, edited at the checkpoint.")).toBeVisible({
      timeout: 30_000,
    });
  });

  await test.step("SCRIPT → ASSETS, thumbnail crowned at the checkpoint", async () => {
    await approveCheckpoint("Assets gate");
    await page.getByRole("button", { name: "Select thumbnail 1" }).click();
    await expect(
      page.getByTestId("checkpoint-panel").locator(".ring-accent").first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  await test.step("ASSETS → mock render → FINAL → APPROVED, all in place", async () => {
    await approveCheckpoint("Final cut gate");
    await page
      .getByTestId("checkpoint-panel")
      .getByRole("button", { name: "Approve & continue" })
      .click();
    await expect(page.getByText("Already uploaded it?")).toBeVisible({ timeout: 120_000 });
  });

  await test.step("publish from the same page → TRACKING", async () => {
    await page
      .locator('input[placeholder="https://youtu.be/…"]')
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Mark as uploaded" }).click();
    await expect(page.getByText("Tracking").first()).toBeVisible({ timeout: 60_000 });
  });

  await test.step("the Library shows the asset in Published with the full bar", async () => {
    await page.goto(libUrl);
    await expect(page.getByRole("button", { name: /Published/ })).toBeVisible({
      timeout: 30_000,
    });
  });
});

test("autopilot v2: merged surface renders operator system + boost", async ({ page }) => {
  await signInOrBootstrap(page);
  await page.goto(`${projectUrl}/autopilot`);
  await expect(page.getByRole("heading", { name: "Autopilot" })).toBeVisible({
    timeout: 30_000,
  });
  // The operator's go-live checklist (not yet launched in a fresh project).
  await expect(page.getByText("Go-live checklist")).toBeVisible();
  // Boost (the demoted Build & Post) opens the batch modal.
  await expect(page.getByText("Boost — one-off batch")).toBeVisible();
  await page.getByRole("button", { name: /Build & Post/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
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
