import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
  parseExistingProjectAdoptionPlanViewModel,
  type AdoptionPreviewItem,
  type ExistingProjectAdoptionPlanViewModel,
} from "@intentloom/protocol";
import { existingProjectAdoptionPlanDesktopMethods } from "../apps/desktop/src/desktop-client-adoption-plan.js";
import { loadAdoptionPreview } from "../apps/desktop/src/views/adoption-preview-controller.js";
import {
  classifyAdoptionPlanItem,
  groupAdoptionPlanItems,
} from "../apps/desktop/src/views/adoption-preview-grouping.js";
import {
  adoptionPreviewFocusOrder,
  renderAdoptionPreviewText,
} from "../apps/desktop/src/views/adoption-preview-presentation.js";
import { workspaceViews } from "../apps/desktop/src/workspace-navigation.js";
import { buildWorkspaceCommandOptions } from "../apps/desktop/src/workspace-command-options.js";

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
    diagnostics: [
      "existing project-owned instruction file requires a mapping decision",
    ],
    nextActions: [
      "Keep the file project-owned or explicitly resolve the generated destination conflict.",
    ],
    applied: false,
    previewIdentity: "a".repeat(64),
    items: [
      item({
        path: ".aif/config.yaml",
        proposedClassification: "aif-metadata",
      }),
      item({
        path: ".aif/local.example.yaml",
        proposedClassification: "aif-metadata",
      }),
      item({
        path: ".aif/manifest.lock.json",
        proposedClassification: "aif-metadata",
      }),
      item({
        path: ".aif/source-map.json",
        proposedClassification: "aif-metadata",
      }),
      item({
        path: ".agents/skills/example/SKILL.md",
        action: "generated-candidate",
      }),
      item({
        path: "README.md",
        action: "map-existing-project-owned",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        writeEligible: false,
        reason: "existing project document maps to the public-readme concept",
        safeNextAction: "Keep the existing file project-owned.",
      }),
      item({
        path: "docs/architecture/overview.md",
        action: "map-existing-aif-compatible-document",
        currentClassification: "project-owned",
        proposedClassification: "project-owned-documentation",
        writeEligible: false,
        reason: "existing project document maps to the architecture concept",
        safeNextAction: "Keep the existing file project-owned.",
      }),
      item({
        path: "AGENTS.md",
        action: "map-existing-project-owned",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        writeEligible: false,
        manualDecisionRequired: true,
        reason: "existing destination has no Intentloom ownership record",
        conflictDetails: ["existing project-owned instruction file"],
        safeNextAction:
          "Keep the file project-owned or explicitly resolve the generated destination conflict.",
      }),
      item({
        path: "package.json",
        action: "skip",
        currentClassification: "project-owned",
        proposedClassification: "project-owned",
        writeEligible: false,
        reason: "project file is not an adoption artifact",
        safeNextAction: "Leave the unrelated project file unchanged.",
      }),
    ],
    ...overrides,
  });
}

describe("Desktop read-only adoption preview", () => {
  it("renders project summary from the typed viewmodel", () => {
    const plan = viiLikePlan();
    const text = renderAdoptionPreviewText({
      status: "ready",
      selectedRoot: plan.root,
      plan,
      errorMessage: null,
    });
    expect(text).toContain("Selected project: /workspace/example");
    expect(text).toContain("Canonical root: /workspace/example");
    expect(text).toContain("Engineering profile: typescript");
    expect(text).toContain("Workspace topology: nx");
    expect(text).toContain("Adapters: codex, cursor, copilot");
    expect(text).not.toContain("Vii");
  });

  it("groups creates, mappings, and skips without mixing decisions", () => {
    const groups = groupAdoptionPlanItems(viiLikePlan().items);
    const byId = Object.fromEntries(groups.map((group) => [group.id, group]));
    expect(byId["planned-metadata"]?.items.map((entry) => entry.path)).toEqual([
      ".aif/config.yaml",
      ".aif/local.example.yaml",
      ".aif/manifest.lock.json",
      ".aif/source-map.json",
    ]);
    expect(
      byId["generated-guidance"]?.items.map((entry) => entry.path),
    ).toEqual([".agents/skills/example/SKILL.md"]);
    expect(byId["existing-files"]?.items.map((entry) => entry.path)).toEqual([
      "README.md",
      "docs/architecture/overview.md",
    ]);
    expect(byId["skipped"]?.items.map((entry) => entry.path)).toEqual([
      "package.json",
    ]);
    expect(byId["requires-decision"]?.items.map((entry) => entry.path)).toEqual(
      ["AGENTS.md"],
    );
    expect(classifyAdoptionPlanItem(viiLikePlan().items[7]!)).toBe(
      "requires-decision",
    );
  });

  it("makes manual decisions and conflicts distinguishable in accessible text", () => {
    const plan = viiLikePlan();
    const text = renderAdoptionPreviewText({
      status: "ready",
      selectedRoot: plan.root,
      plan,
      errorMessage: null,
    });
    expect(text).toContain("Requires attention");
    expect(text).toContain("Requires decision");
    expect(text).toContain("AGENTS.md");
    expect(text).toContain("Current classification: project-owned");
    expect(text).toContain(
      "Conflict details: existing project-owned instruction file",
    );
    expect(text).toContain("Safe next action:");
    expect(text).toContain("Available future resolution: Keep project-owned");
    expect(text).toContain("Decisions prepared: 0");
    expect(text).toContain("Changes applied: 0");
    expect(text).toContain("Diagnostic:");
    expect(text).toMatch(/Keyboard order:.*Requires decision AGENTS.md/);
  });

  it("renders loading, empty, and request-error states", async () => {
    const empty = await loadAdoptionPreview({
      root: "/workspace/example",
      client: {
        existingProjectAdoptionPlan: async () =>
          viiLikePlan({ items: [], diagnostics: [], nextActions: [] }),
      },
    });
    expect(empty.status).toBe("empty");
    expect(empty.selectedRoot).toBe("/workspace/example");

    const idle = await loadAdoptionPreview({
      root: null,
      client: {
        existingProjectAdoptionPlan: async () => {
          throw new Error("should not run");
        },
      },
    });
    expect(idle.status).toBe("idle");
    expect(idle.invokedMethods).toEqual([]);

    const disconnected = await loadAdoptionPreview({
      root: "/workspace/example",
      client: {
        existingProjectAdoptionPlan: async () => {
          throw Object.assign(new Error("daemon disconnected"), {
            code: "disconnected",
          });
        },
      },
    });
    expect(disconnected.status).toBe("disconnected");
    expect(disconnected.errorMessage).toContain("daemon disconnected");
    expect(
      renderAdoptionPreviewText({
        status: "loading",
        selectedRoot: "/workspace/example",
        plan: null,
        errorMessage: null,
      }),
    ).toContain("Status: loading");
  });

  it("maps unsupported and authentication failures without mutating", async () => {
    const unsupported = await loadAdoptionPreview({
      root: "/workspace/example",
      client: {
        existingProjectAdoptionPlan: async () => {
          throw Object.assign(new Error("capability missing"), {
            code: "unsupported_capability",
          });
        },
      },
    });
    expect(unsupported.status).toBe("unsupported");
    const auth = await loadAdoptionPreview({
      root: "/workspace/example",
      client: {
        existingProjectAdoptionPlan: async () => {
          throw Object.assign(new Error("auth failed"), {
            code: "authentication_failed",
          });
        },
      },
    });
    expect(auth.status).toBe("authentication-failure");
  });

  it("invokes only existingProjectAdoptionPlan and never an apply method", async () => {
    const invoked: string[] = [];
    const client = {
      existingProjectAdoptionPlan: vi.fn<
        (root: string) => Promise<ExistingProjectAdoptionPlanViewModel>
      >(async (root: string) => {
        invoked.push("existingProjectAdoptionPlan");
        return viiLikePlan({ root });
      }),
      existingProjectAdoptionApply: vi.fn<() => void>(),
    };
    const first = await loadAdoptionPreview({
      root: "/workspace/example",
      client,
    });
    const retry = await loadAdoptionPreview({
      root: "/workspace/example",
      client,
    });
    expect(first.invokedMethods).toEqual(["existingProjectAdoptionPlan"]);
    expect(retry.invokedMethods).toEqual(["existingProjectAdoptionPlan"]);
    expect(client.existingProjectAdoptionPlan).toHaveBeenCalledTimes(2);
    expect(client.existingProjectAdoptionApply).not.toHaveBeenCalled();
    expect(invoked).toEqual([
      "existingProjectAdoptionPlan",
      "existingProjectAdoptionPlan",
    ]);
  });

  it("keeps the selected root visible after retry", async () => {
    const result = await loadAdoptionPreview({
      root: "/workspace/example",
      client: {
        existingProjectAdoptionPlan: async () => viiLikePlan(),
      },
    });
    const text = renderAdoptionPreviewText(result);
    expect(text).toContain("Selected project: /workspace/example");
    expect(result.selectedRoot).toBe("/workspace/example");
  });

  it("composes select, inspect, preview, and a manual decision", async () => {
    const selectedRoot = "/workspace/example";
    const inspect = { root: selectedRoot, projectId: "example-workspace" };
    const preview = await loadAdoptionPreview({
      root: inspect.root,
      projectId: inspect.projectId,
      client: {
        existingProjectAdoptionPlan: async (root, projectId) =>
          viiLikePlan({ root, projectId: projectId ?? "example-workspace" }),
      },
    });
    expect(inspect.root).toBe(selectedRoot);
    expect(preview.status).toBe("ready");
    const text = renderAdoptionPreviewText(preview);
    expect(text).toContain("Manual decisions required");
    expect(text).toContain("Requires decision | AGENTS.md");
    expect(adoptionPreviewFocusOrder(preview.status, preview.plan)[0]?.id).toBe(
      "adoption-preview-heading",
    );
  });

  it("sends the adoption-plan protocol method from the typed client", async () => {
    const requests: object[] = [];
    const methods = existingProjectAdoptionPlanDesktopMethods(
      async (request) => {
        requests.push(request);
        return viiLikePlan();
      },
    );
    await methods.existingProjectAdoptionPlan("/workspace/example");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
    });
    expect(Object.keys(methods)).toEqual(["existingProjectAdoptionPlan"]);
  });

  it("keeps the Tauri allowlist on preview and denies unknown mutate RPC", () => {
    const allowlist = readFileSync(
      join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
      "utf8",
    );
    expect(allowlist).toContain("intentloom.existing-project.adoption.plan.v1");
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.decisions.v1",
    );
    expect(allowlist).toContain(
      "intentloom.existing-project.adoption.apply.v1",
    );
    expect(allowlist).toMatch(
      /assert!\(\s*!is_foundation_method\(\s*"intentloom\.existing-project\.adoption\.mutate\.v1"/,
    );
    expect(workspaceViews.map((view) => view.label)).toContain(
      "Adoption preview",
    );
    const options = buildWorkspaceCommandOptions({
      theme: "dark",
      setActiveView: () => undefined,
      requestProjectSelect: () => undefined,
      connectDaemon: () => undefined,
      loadDiff: () => undefined,
      loadTimeline: () => undefined,
      setTheme: () => undefined,
    });
    expect(options.some((option) => option.id === "nav-adoption-preview")).toBe(
      true,
    );
  });
});
