/**
 * MVDA Phase B — the /edit Cut editor over the mock pipeline (plan §5).
 *
 * Drives an asset to the ASSETS gate in mock mode (same journey as the
 * golden path), then exercises the editor end-to-end:
 *
 *   Open editor from the Canvas → compiled v1 loads (timeline + Player)
 *   → select a clip → retime it → Save version (v2, activated)
 *   → Canvas checkpoint re-labels ASSETS as the CUT gate
 *   → Approve cut resolves the gate through decideGate.
 *
 * Same realtime-lag tolerances as the golden path: server truth is asserted
 * after reloads, never raced against the live repaint.
 */
import { expect, test } from "@playwright/test";
import { signInOrBootstrap } from "./helpers";

test.describe.configure({ mode: "serial" });
// The full journey is the golden path PLUS the editor drive; sandbox/CI
// local stacks reload slowly, so the budget is generous.
test.setTimeout(420_000);

test("cut editor: compile v1 → retime → save v2 → CUT gate → approve", async ({ page }) => {
  await signInOrBootstrap(page);

  // Fresh project in mock mode.
  await page.getByRole("link", { name: /New Project/ }).first().click();
  await page.waitForURL(/\/projects\/new/);
  await page.locator('input[name="name"]').fill(`Cut editor ${Date.now()}`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("button", { name: /Create project|Creating…/ })
    .click({ timeout: 15_000 })
    .catch(() => {});
  await page.waitForURL(/\/projects\/[0-9a-f-]+(\/library)?$/, { timeout: 60_000 });
  const projectUrl = new URL(page.url()).pathname.replace(/\/library$/, "");

  // Asset → Canvas → approve IDEA and SCRIPT so mock assets generate.
  await page.goto(`${projectUrl}/library`);
  await page.locator('input[placeholder^="Type a video topic"]').fill("Cut editor journey");
  await page.getByRole("button", { name: "New asset" }).click();
  await expect(async () => {
    await page.reload();
    await expect(page.getByTestId("asset-tile").first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByText("Cut editor journey").first().click();
  await page.waitForURL(/\/videos\/[0-9a-f-]+/);
  const videoUrl = new URL(page.url()).pathname;

  const approveCheckpoint = async (nextGate: RegExp) => {
    const approve = page
      .getByTestId("checkpoint-panel")
      .getByRole("button", { name: "Approve & continue" });
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await approve.click();
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("checkpoint-panel").getByText(nextGate)).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 120_000 });
  };
  await approveCheckpoint(/Script gate/);
  await approveCheckpoint(/Assets gate|Cut gate/);

  await test.step("open the editor — the compiler's v1 loads", async () => {
    await page.getByRole("link", { name: /Open editor/ }).click();
    await page.waitForURL(/\/edit$/, { timeout: 60_000 });
    await expect(page.getByTestId("edd-editor")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("edd-timeline")).toBeVisible();
    // Version strip shows the compiled root.
    await expect(page.getByText("compiled from the legacy cut")).toBeVisible();
    await expect(page.getByText(/^v1$/)).toBeVisible();
  });

  await test.step("select a clip and retime it — live validation stays green", async () => {
    // Mock-mode VO is one whole-video asset (no per-beat rows), so compiled
    // clips carry the silent marker — match the label prefix, not exact text.
    await page.getByTestId("edd-timeline").getByText(/^b0/).first().click();
    await expect(page.getByTestId("edd-inspector").getByText(/Clip v1 · beat 0/)).toBeVisible();
    const duration = page.getByLabel("duration seconds");
    await duration.fill("8");
    await duration.blur();
    // Save unlocks only when the doc is dirty AND valid.
    await expect(page.getByRole("button", { name: "Save version" })).toBeEnabled();
  });

  await test.step("save creates v2 and activates it", async () => {
    await page
      .locator('input[placeholder^="What changed"]')
      .fill("retimed beat 0 in the e2e");
    await page.getByRole("button", { name: "Save version" }).click();
    await expect(page.getByText(/Saved & activated \(v2\)/)).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(/^v2$/)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  });

  await test.step("the Canvas checkpoint is now the CUT gate", async () => {
    await page.goto(videoUrl);
    await expect(page.getByTestId("checkpoint-panel").getByText("Cut gate")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("link", { name: /Open editor · cut v2/ })).toBeVisible();
  });

  await test.step("approve the cut from the editor — the gate resolves", async () => {
    await page.goto(`${videoUrl}/edit`);
    await expect(page.getByTestId("edd-editor")).toBeVisible({ timeout: 30_000 });
    const approve = page.getByRole("button", { name: "Approve cut" });
    await expect(approve).toBeEnabled();
    await approve.click();
    await expect(page.getByText(/Cut approved/)).toBeVisible({ timeout: 60_000 });
    // The video left the gate (mock render carries it toward FINAL_REVIEW).
    await expect(async () => {
      await page.goto(videoUrl);
      await expect(
        page.getByText(/Final gate|assembling|final review/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 120_000 });
  });
});
