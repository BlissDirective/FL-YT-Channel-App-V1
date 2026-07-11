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
 * This is the characterization suite from Phase 0, retargeted at the v2
 * surfaces in Phase 7 (the review queue and old project hub are retired;
 * their routes redirect to the Library). Coverage never dipped: the same
 * journey, the same server actions, the new UI.
 *
 * Requires (set by the e2e-authed CI job, or a local `supabase start`):
 *   AUTHED_E2E=1, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY — the app must be BUILT with these env vars.
 */
import { expect, test, type Page } from "@playwright/test";
import { signInOrBootstrap } from "./helpers";


test("library v2: asset born in Ideas, quick-approved through sections, killable", async ({
  page,
}) => {
  await signInOrBootstrap(page);

  // Fresh project for isolation.
  await page.getByRole("link", { name: /New Project/ }).first().click();
  await page.waitForURL(/\/projects\/new/);
  await page.locator('input[name="name"]').fill(`Library v2 ${Date.now()}`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  // The submit's label swaps to "Creating…" and the redirect unmounts it
  // mid-click, which can strand Playwright's actionability retry loop
  // (unbounded by default) even though the action fired — bound the click
  // and let the waitForURL below be the real assertion.
  await page
    .getByRole("button", { name: /Create project|Creating…/ })
    .click({ timeout: 15_000 })
    .catch(() => {});
  // createProject redirects to /projects/:id, which re-redirects to the
  // Library (the project home since the v2 cutover) — match either landing.
  await page.waitForURL(/\/projects\/[0-9a-f-]+(\/library)?$/, { timeout: 60_000 });
  const libUrl = `${new URL(page.url()).pathname.replace(/\/library$/, "")}/library`;

  await test.step("new asset lands in the Ideas section, awaiting the operator", async () => {
    await page.goto(libUrl);
    await page
      .locator('input[placeholder^="Type a video topic"]')
      .fill("Library quick-action journey");
    await page.getByRole("button", { name: "New asset" }).click();
    // New-asset creation persists server-side; the tile's appearance in the
    // Ideas section is a Realtime repaint, unreliable on the CI local stack.
    // Reload to observe the committed tile rather than race the live insert.
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Ideas/ })).toBeVisible();
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

  // A quick-approve advances the video server-side (the action's revalidated
  // payload already carries the next gate) and calls router.refresh(), but the
  // section-reclassified tile repaints off a Supabase Realtime event — and the
  // CI local stack's realtime is unreliable, so the grid can lag the DB. Reload
  // to assert the server truth (the pipeline advance) rather than race the
  // client repaint; a stage-labelled tile after reload proves the approve took.
  const approveAndReload = async (nextGate: string) => {
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(nextGate).first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 120_000 });
  };

  await test.step("quick-approve moves the tile Ideas → Script → Production", async () => {
    await approveAndReload("Script gate");
    await approveAndReload("Assets gate");
    await expect(page.getByRole("button", { name: /Production/ })).toBeVisible();
  });

  await test.step("kill from the tile removes the asset (confirmed + audited)", async () => {
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Kill" }).click();
    // Same realtime-lag tolerance as the approvals: reload to observe the
    // server-side kill rather than race the grid's live removal.
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("asset-tile")).toHaveCount(0, { timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  });
});

test("golden path: idea → tracking on Library + Asset Canvas", async ({
  page,
}) => {
  await signInOrBootstrap(page);

  await page.getByRole("link", { name: /New Project/ }).first().click();
  await page.waitForURL(/\/projects\/new/);
  await page.locator('input[name="name"]').fill(`Canvas v2 ${Date.now()}`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  // Same detach-tolerant click as the first spec (label swap + redirect).
  await page
    .getByRole("button", { name: /Create project|Creating…/ })
    .click({ timeout: 15_000 })
    .catch(() => {});
  await page.waitForURL(/\/projects\/[0-9a-f-]+/, { timeout: 60_000 });
  projectUrl = new URL(page.url()).pathname.replace(/\/library$/, "");
  const libUrl = `${projectUrl}/library`;

  await test.step("asset born from the Library, opened on the Canvas", async () => {
    await page.goto(libUrl);
    await page
      .locator('input[placeholder^="Type a video topic"]')
      .fill("Canvas contained-pipeline journey");
    await page.getByRole("button", { name: "New asset" }).click();
    // Reload-tolerant tile appearance (CI realtime flakiness — see test 1).
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await page.getByText("Canvas contained-pipeline journey").first().click();
    await page.waitForURL(/\/videos\/[0-9a-f-]+/);
    await expect(page.getByTestId("checkpoint-panel")).toBeVisible();
    await expect(page.getByText("Idea gate")).toBeVisible();
  });

  // The checkpoint approve advances the video server-side (verified via the
  // action's revalidated payload) but the panel repaints off the same
  // Realtime channel the Library tiles use — unreliable on the CI local
  // stack. Reload to assert the server truth rather than race the repaint.
  const approveCheckpoint = async (nextGate: string) => {
    await page
      .getByTestId("checkpoint-panel")
      .getByRole("button", { name: "Approve & continue" })
      .click();
    await expect(async () => {
      await page.reload();
      await expect(
        page.getByTestId("checkpoint-panel").getByText(nextGate),
      ).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 120_000 });
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
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("Already uploaded it?")).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 120_000 });
  });

  await test.step("publish from the same page → TRACKING", async () => {
    await page
      .locator('input[placeholder="https://youtu.be/…"]')
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Mark as uploaded" }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("Tracking").first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
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

test("feed v2: filtered activity stream with the project's events", async ({ page }) => {
  await signInOrBootstrap(page);
  await page.goto(`${projectUrl}/feed`);
  await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible({ timeout: 30_000 });
  // The golden-path project has history — entries render, incl. the publish.
  await expect(page.getByText(/Published & tracking/).first()).toBeVisible();
  // Filters narrow the stream.
  await page.getByRole("tab", { name: "Needs action" }).click();
  await expect(page.getByText(/Published & tracking/)).toHaveCount(0);
  await page.getByRole("tab", { name: "All" }).click();
  await expect(page.getByRole("button", { name: "Generate insights" })).toBeVisible();
});

test("baseline screenshots of the main authenticated routes", async ({ page }, testInfo) => {
  await signInOrBootstrap(page);
  const routes: [string, string][] = [
    ["home", "/"],
    ["intel", "/intel"],
    ["costs", "/costs"],
    ["settings", "/settings"],
    ["library", projectUrl ? `${projectUrl}/library` : "/"],
    ["autopilot", projectUrl ? `${projectUrl}/autopilot` : "/"],
    ["feed", projectUrl ? `${projectUrl}/feed` : "/"],
  ];
  for (const [name, route] of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const path = testInfo.outputPath(`baseline-${name}.png`);
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`baseline-${name}`, { path, contentType: "image/png" });
  }
});
