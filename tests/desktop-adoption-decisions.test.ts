import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
  parseExistingProjectAdoptionDecisionViewModel,
  parseExistingProjectAdoptionPlanViewModel,
  supportedAdoptionDecisionKinds,
  type AdoptionPreviewItem,
  type ExistingProjectAdoptionDecisionViewModel,
  type ExistingProjectAdoptionPlanViewModel,
} from "@intentloom/protocol";
import { existingProjectAdoptionDecisionsDesktopMethods } from "../apps/desktop/src/desktop-client-adoption-decisions.js";
import {
  clearStaleAdoptionDecisions,
  selectedDecisionsFromMap,
  validateAdoptionDecisions,
} from "../apps/desktop/src/views/adoption-decision-controller.js";
import {
  renderAdoptionDecisionSummary,
  renderAdoptionDecisionText,
} from "../apps/desktop/src/views/adoption-decision-presentation.js";
import { adoptionPreviewFocusOrder } from "../apps/desktop/src/views/adoption-preview-presentation.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function item(
  overrides: Partial<AdoptionPreviewItem> & Pick<AdoptionPreviewItem, "path">,
): AdoptionPreviewItem {
  return {
    action: "create",
    currentClassification: "absent",
    proposedClassification: "aif-generated",
    reason: "safe generated destination is absent",
    canonicalSource: null,
    adapter: null,
    profile: "typescript",
    conflictDetails: [],
    writeEligible: true,
    manualDecisionRequired: false,
    safeNextAction: "Apply the reviewed proposal to create this file.",
    ...overrides,
  };
}

function viiLikePlan(
  overrides: Partial<ExistingProjectAdoptionPlanViewModel> = {},
): ExistingProjectAdoptionPlanViewModel {
  return parseExistingProjectAdoptionPlanViewModel({
    readOnly: true,
    classification: "read-only",
    root: "/workspace/example",
    projectId: "example-workspace",
    profile: "typescript",
    workspaceTopology: "nx",
    detectedAdapters: ["codex", "cursor", "copilot"],
    readiness: "not-initialized",
    instructionPaths: ["AGENTS.md"],
    diagnostics: [],
    nextActions: [],
    applied: false,
    previewIdentity: "a".repeat(64),
    items: [
      item({
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        writeEligible: false,
        manualDecisionRequired: true,
        reason: "existing destination has no Intentloom ownership record",
        safeNextAction: "Keep the file project-owned.",
      }),
      item({
        path: "docs/architecture.md",
        action: "manual-decision-required",
        currentClassification: "project-owned",
        proposedClassification: "project-owned-documentation",
        writeEligible: false,
        manualDecisionRequired: true,
        reason: "multiple project documents represent the architecture concept",
        safeNextAction: "Choose the authoritative project document manually.",
      }),
    ],
    ...overrides,
  });
}

function validDecisionResult(
  overrides: Partial<ExistingProjectAdoptionDecisionViewModel> = {},
): ExistingProjectAdoptionDecisionViewModel {
  const plan = viiLikePlan();
  const agents = plan.items[0]!;
  return parseExistingProjectAdoptionDecisionViewModel({
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    root: plan.root,
    projectId: plan.projectId,
    previewIdentity: plan.previewIdentity,
    stalePreview: false,
    decisionsPrepared: 1,
    remainingManualDecisionPaths: ["docs/architecture.md"],
    evaluations: [
      {
        path: "AGENTS.md",
        kind: "keep-project-owned",
        status: "valid",
        reason: null,
        supportedChoices: ["keep-project-owned"],
        resolvedItem: {
          ...agents,
          manualDecisionRequired: false,
        },
      },
    ],
    ...overrides,
  });
}

describe("Desktop adoption decision modeling", () => {
  it("exposes only supported choices for a Vii-like AGENTS.md item", () => {
    const agents = viiLikePlan().items[0]!;
    expect(supportedAdoptionDecisionKinds(agents)).toEqual([
      "keep-project-owned",
    ]);
    const text = renderAdoptionDecisionText({
      item: agents,
      selectedKind: "keep-project-owned",
      evaluation: validDecisionResult().evaluations[0]!,
    });
    expect(text).toContain("Supported choices: Keep project-owned");
    expect(text).not.toContain("Replace");
    expect(text).toContain("This decision is not applied to the project.");
    expect(text).toContain("Valid decision ready for a future prepared plan.");
  });

  it("keeps decision selection local and never calls apply", async () => {
    const client = {
      existingProjectAdoptionDecisions: vi.fn<
        () => Promise<ExistingProjectAdoptionDecisionViewModel>
      >(async () => validDecisionResult()),
      existingProjectAdoptionApply: vi.fn<() => void>(),
    };
    const result = await validateAdoptionDecisions({
      root: "/workspace/example",
      previewIdentity: "a".repeat(64),
      selections: new Map([["AGENTS.md", "keep-project-owned"]]),
      client,
    });
    expect(result.status).toBe("ready");
    expect(result.result?.changesApplied).toBe(0);
    expect(result.invokedMethods).toEqual(["existingProjectAdoptionDecisions"]);
    expect(client.existingProjectAdoptionApply).not.toHaveBeenCalled();
    expect(
      renderAdoptionDecisionSummary({
        decisionsPrepared: result.result?.decisionsPrepared ?? 0,
        changesApplied: 0,
      }),
    ).toBe("Decisions prepared: 1\nChanges applied: 0");
  });

  it("rejects a tampered or stale preview without persisting changes", async () => {
    const stale = await validateAdoptionDecisions({
      root: "/workspace/example",
      previewIdentity: "a".repeat(64),
      selections: new Map([["AGENTS.md", "keep-project-owned"]]),
      client: {
        existingProjectAdoptionDecisions: async () =>
          validDecisionResult({ stalePreview: true }),
      },
    });
    expect(stale.status).toBe("stale");
    expect(stale.result?.changesApplied).toBe(0);
    expect(
      clearStaleAdoptionDecisions(
        "/other/root",
        "/workspace/example",
        "a".repeat(64),
        "a".repeat(64),
      ),
    ).toBe(true);
    expect(
      clearStaleAdoptionDecisions(
        "/workspace/example",
        "/workspace/example",
        "a".repeat(64),
        "b".repeat(64),
      ),
    ).toBe(true);
  });

  it("maps daemon disconnect to an error and does not apply", async () => {
    const disconnected = await validateAdoptionDecisions({
      root: "/workspace/example",
      previewIdentity: "a".repeat(64),
      selections: new Map([["AGENTS.md", "keep-project-owned"]]),
      client: {
        existingProjectAdoptionDecisions: async () => {
          throw Object.assign(new Error("daemon disconnected"), {
            code: "disconnected",
          });
        },
      },
    });
    expect(disconnected.status).toBe("disconnected");
    expect(disconnected.result).toBeNull();
  });

  it("keeps multiple selected decisions deterministic and keyboard labeled", () => {
    const plan = viiLikePlan();
    const selections = selectedDecisionsFromMap(
      new Map([
        ["docs/architecture.md", "map-existing-compatible-document"],
        ["AGENTS.md", "keep-project-owned"],
      ]),
    );
    expect(selections.map((decision) => decision.path)).toEqual([
      "AGENTS.md",
      "docs/architecture.md",
    ]);
    const focus = adoptionPreviewFocusOrder("ready", plan).map(
      (target) => target.label,
    );
    expect(focus).toContain("Keep project-owned for AGENTS.md");
    expect(focus).toContain(
      "Map existing compatible document for docs/architecture.md",
    );
  });

  it("sends the decisions protocol method from the typed client", async () => {
    const requests: object[] = [];
    const methods = existingProjectAdoptionDecisionsDesktopMethods(
      async (request) => {
        requests.push(request);
        return validDecisionResult();
      },
    );
    await methods.existingProjectAdoptionDecisions(
      "/workspace/example",
      "a".repeat(64),
      [{ path: "AGENTS.md", kind: "keep-project-owned" }],
    );
    expect(requests[0]).toMatchObject({
      method: EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
    });
    expect(Object.keys(methods)).toEqual(["existingProjectAdoptionDecisions"]);
  });

  it("keeps the Tauri allowlist on decisions and excludes apply", () => {
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.decisions.v1",
    );
    expect(allowlist).toMatch(
      /assert!\(\s*!is_foundation_method\(\s*"intentloom\.existing-project\.adoption\.apply\.v1"/,
    );
  });
});
