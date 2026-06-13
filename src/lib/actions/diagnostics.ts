"use server";

import { testCredential } from "@/lib/adapters/credential-test";
import { TESTABLE_SERVICES, type TestableService } from "@/lib/adapters/health";

export type TestResult = { ok: boolean; detail: string; latencyMs?: number };

/** Live-ping a provider credential from the settings panel (Phase 9). */
export async function testCredentialAction(service: string): Promise<TestResult> {
  if (!TESTABLE_SERVICES.includes(service as TestableService)) {
    return { ok: false, detail: "Not testable" };
  }
  return testCredential(service as TestableService);
}
