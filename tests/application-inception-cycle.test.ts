import { describe, expect, it } from "vitest";
import type { InceptionSummary } from "@intentloom/application";
import * as application from "@intentloom/application";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const importComponents = [
  ["approved-apply-baseline.ts", "generated-file-sync-declared.ts", "index.ts"],
  [
    "foundation-discovery.ts",
    "foundation-viewmodel.ts",
    "foundation-workshop.ts",
  ],
  [
    "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
    "neutron/mutation/apply/neutron-mutation-apply-store.ts",
    "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
  ],
];

const indexReexportComponent = [
  "approved-apply-baseline.ts",
  "approved-apply-engine.ts",
  "bounded-execution-apply.ts",
  "bounded-execution-w11.ts",
  "bounded-execution-workspace-cli.ts",
  "bounded-execution-workspace.ts",
  "engineering-quality-entry.ts",
  "engineering-quality/cli-specialized-packs-external.ts",
  "engineering-quality/index.ts",
  "engineering-quality/specialized-pack-external-apply.ts",
  "engineering-quality/specialized-pack-external-viewmodel.ts",
  "existing-project-adoption-apply-gates.ts",
  "existing-project-adoption-apply-health.ts",
  "existing-project-adoption-apply.ts",
  "existing-project-adoption-approval.ts",
  "existing-project-adoption-decisions.ts",
  "existing-project-adoption-plan.ts",
  "existing-project-adoption-prepared-plan-revalidate.ts",
  "existing-project-adoption-prepared-plan.ts",
  "existing-project-w9.ts",
  "existing-project-workspace-cli.ts",
  "existing-project-workspace.ts",
  "foundation-flow.ts",
  "generated-file-sync-declared.ts",
  "harness/harness-benchmark-sample.ts",
  "harness/harness-benchmark.ts",
  "harness/harness.ts",
  "inception-flow.ts",
  "index.ts",
];

const reexportComponents = [
  [
    "apply-extension-update.ts",
    "discover-and-apply-extension-update.ts",
    "extension-update-files.ts",
    "propose-and-apply-extension-adoption.ts",
  ],
  indexReexportComponent,
  ...importComponents.slice(1),
];

const summaryFixture = {
  sessionId: "inc_summary",
  root: "/project",
  idea: "idea",
  status: "in-progress",
  totalQuestions: 1,
  answeredQuestions: 0,
  pendingQuestions: 1,
  confirmedAnswers: 0,
  assumptionsCount: 0,
  constraintsCount: 0,
  alternativesCount: 0,
} satisfies InceptionSummary;

describe("application inception viewmodel cycle", () => {
  it("keeps InceptionSummary importable from the application root", () => {
    expect(summaryFixture.sessionId).toBe("inc_summary");
    expect(application).not.toHaveProperty("InceptionSummary");
  });

  it("keeps the shared summary type off both cycle members", () => {
    expect(
      relativeSpecifiers("inception/inception-summary-types.ts", true),
    ).toEqual([]);
    expect(relativeSpecifiers("inception-viewmodel.ts", true)).not.toContain(
      "./inception.js",
    );
    expect(relativeSpecifiers("inception.ts", false)).toContain(
      "./inception-viewmodel.js",
    );
    expect(relativeSpecifiers("inception.ts", false)).toContain(
      "./inception/inception-summary-types.js",
    );
    expect(relativeSpecifiers("inception-viewmodel.ts", false)).toContain(
      "./inception/inception-summary-types.js",
    );
  });

  it("keeps the inception pair out of the remaining cycles", () => {
    expect(applicationCycles(false)).toEqual(importComponents);
    expect(applicationCycles(true)).toEqual(reexportComponents);
  });
});
