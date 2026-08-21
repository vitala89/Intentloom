import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  activateExternalSpecializedPack,
  applyExternalSpecializedPackActivation,
  buildExternalSpecializedPackApplyViewModel,
  buildExternalSpecializedPackPreviewViewModel,
  computeExternalSpecializedPackDigest,
  createMemoryFileSystem,
  previewExternalSpecializedPack,
} from "@intentloom/application";
import {
  parseExternalSpecializedPackApplyViewModel,
  parseExternalSpecializedPackPreviewViewModel,
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  type ExternalQualityPackActivationApproval,
  type ExternalSpecializedPackApplyViewModel,
  type ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import { specializedPackExternalDesktopMethods } from "../apps/desktop/src/desktop-client-specialized-pack-external.js";
import {
  activateExternalSpecializedPackFromApproval,
  canActivateExternalSpecializedPack,
  canApproveExternalSpecializedPack,
} from "../apps/desktop/src/views/specialized-pack-external-activate-controller.js";
import { buildExternalSpecializedPackActivationApproval } from "../apps/desktop/src/views/specialized-pack-external-approval.js";
import { isExternalSpecializedPackReviewStale } from "../apps/desktop/src/views/specialized-pack-external-input-staleness.js";
import { loadExternalSpecializedPackPreview } from "../apps/desktop/src/views/specialized-pack-external-preview-controller.js";
import {
  EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
  shouldClearExternalSpecializedPackPreview,
} from "../apps/desktop/src/views/specialized-pack-external-preview-types.js";
import { DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID } from "../apps/desktop/src/views/specialized-pack-external-reviewer.js";
import {
  externalManifest,
  previewInput,
  projectRoot,
} from "./specialized-pack-s8e-doctor-fixture.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function readyPreviewViewModel(): ExternalSpecializedPackPreviewViewModel {
  const manifest = externalManifest();
  const preview = previewExternalSpecializedPack(previewInput(manifest));
  return buildExternalSpecializedPackPreviewViewModel(preview);
}

function readyInput(manifest = externalManifest()) {
  const viewmodel = buildExternalSpecializedPackPreviewViewModel(
    previewExternalSpecializedPack(previewInput(manifest)),
  );
  return {
    ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
    manifestJson: JSON.stringify(manifest),
    declaredPublisher: manifest.publisher,
    declaredLicense: "MIT",
    sourceKind: viewmodel.source.kind,
    sourceLocator: viewmodel.source.locator,
    sourcePin: viewmodel.source.pin,
    sourceDigest: viewmodel.digest,
  };
}

function reviewSnapshot(root = projectRoot, input = readyInput()) {
  return { root, input };
}

function mockPreviewClient(viewmodel: ExternalSpecializedPackPreviewViewModel) {
  return {
    specializedPacksExternalPreview: vi.fn(async () => viewmodel),
  };
}

function mockActivateClient(result: ExternalSpecializedPackApplyViewModel) {
  return {
    specializedPacksExternalActivate: vi.fn(async () => result),
  };
}

function appliedResult(
  overrides: Partial<ExternalSpecializedPackApplyViewModel> = {},
): ExternalSpecializedPackApplyViewModel {
  const preview = readyPreviewViewModel();
  return {
    status: "applied",
    projectRoot,
    packId: preview.packId,
    digest: preview.digest,
    pin: preview.source.pin,
    changedPaths: [".aif/extension-lock.json"],
    writes: 1,
    diagnostics: [],
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    ...overrides,
  };
}

describe("S8f2 Desktop external specialized pack approval and activation", () => {
  describe("approval eligibility", () => {
    const preview = readyPreviewViewModel();
    const input = readyInput();
    const snapshot = reviewSnapshot(projectRoot, input);

    it("disables approve without preview", () => {
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "idle",
          preview: null,
          snapshot: null,
          input,
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("disables approve while loading preview", () => {
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "loading-preview",
          preview,
          snapshot,
          input,
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("disables approve for rejected preview", () => {
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "rejected",
          preview: { ...preview, status: "rejected", diagnostics: ["network"] },
          snapshot,
          input,
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("enables approve for ready-for-review preview", () => {
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "ready-for-review",
          preview,
          snapshot,
          input,
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(true);
    });

    it("invalidates approval after manifest edit", () => {
      const edited = { ...input, manifestJson: "{}" };
      expect(
        isExternalSpecializedPackReviewStale({
          snapshot,
          root: projectRoot,
          input: edited,
        }),
      ).toBe(true);
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "ready-for-review",
          preview,
          snapshot,
          input: edited,
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("invalidates approval after pin edit", () => {
      const edited = { ...input, sourcePin: "other-pin" };
      expect(
        isExternalSpecializedPackReviewStale({
          snapshot,
          root: projectRoot,
          input: edited,
        }),
      ).toBe(true);
    });

    it("invalidates approval after digest edit", () => {
      const edited = {
        ...input,
        sourceDigest:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      };
      expect(
        isExternalSpecializedPackReviewStale({
          snapshot,
          root: projectRoot,
          input: edited,
        }),
      ).toBe(true);
    });

    it("invalidates approval after locator edit", () => {
      const edited = { ...input, sourceLocator: "./packs/other.json" };
      expect(
        isExternalSpecializedPackReviewStale({
          snapshot,
          root: projectRoot,
          input: edited,
        }),
      ).toBe(true);
    });

    it("invalidates approval after root change", () => {
      expect(
        shouldClearExternalSpecializedPackPreview("/other", projectRoot),
      ).toBe(true);
      expect(
        isExternalSpecializedPackReviewStale({
          snapshot,
          root: "/other",
          input,
        }),
      ).toBe(true);
    });
  });

  describe("approval artifact", () => {
    it("builds from canonical preview", () => {
      const preview = readyPreviewViewModel();
      const approval = buildExternalSpecializedPackActivationApproval(preview);
      expect(approval.decision).toBe("approve");
      expect(approval.source.digest).toBe(preview.digest);
      expect(approval.source.kind).toBe(preview.source.kind);
      expect(approval.source.locator).toBe(preview.source.locator);
      expect(approval.source.pin).toBe(preview.source.pin);
    });

    it("uses desktop-local reviewer identity", () => {
      const approval = buildExternalSpecializedPackActivationApproval(
        readyPreviewViewModel(),
      );
      expect(approval.reviewerId).toBe(
        DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
      );
      expect(approval.reviewerId).not.toContain("<script>");
    });

    it("does not read reviewer identity from manifest", () => {
      const manifest = externalManifest({ publisher: "reviewerId: evil" });
      const preview = buildExternalSpecializedPackPreviewViewModel(
        previewExternalSpecializedPack(previewInput(manifest)),
      );
      const approval = buildExternalSpecializedPackActivationApproval(preview);
      expect(approval.reviewerId).toBe(
        DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
      );
    });
  });

  describe("activation", () => {
    it("returns applied on successful activation", async () => {
      const preview = readyPreviewViewModel();
      const input = readyInput();
      const approval = buildExternalSpecializedPackActivationApproval(preview);
      const result = await activateExternalSpecializedPackFromApproval({
        root: projectRoot,
        input,
        preview,
        approval,
        client: mockActivateClient(appliedResult()),
      });
      expect(result.status).toBe("applied");
      expect(result.result?.changedPaths).toContain(".aif/extension-lock.json");
    });

    it("updates extension-lock through S8c apply path in integration", async () => {
      const fs = createMemoryFileSystem({ [projectRoot]: "" });
      const manifest = externalManifest();
      const preview = previewExternalSpecializedPack(previewInput(manifest));
      const activation = activateExternalSpecializedPack(preview, {
        schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
        decision: "approve",
        reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
        source: preview.source,
      });
      const apply = await applyExternalSpecializedPackActivation(
        {
          root: projectRoot,
          activation,
          approval: {
            schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
            decision: "approve",
            reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
            source: preview.source,
          },
          declaredLicense: "MIT",
        },
        fs,
      );
      expect(apply.status).toBe("applied");
      expect(await fs.exists(`${projectRoot}/.aif/extension-lock.json`)).toBe(
        true,
      );
    });

    it("returns already-applied on identical second activation", async () => {
      const fs = createMemoryFileSystem({ [projectRoot]: "" });
      const manifest = externalManifest();
      const preview = previewExternalSpecializedPack(previewInput(manifest));
      const approval: ExternalQualityPackActivationApproval = {
        schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
        decision: "approve",
        reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
        source: preview.source,
      };
      const activation = activateExternalSpecializedPack(preview, approval);
      const first = await applyExternalSpecializedPackActivation(
        { root: projectRoot, activation, approval, declaredLicense: "MIT" },
        fs,
      );
      const second = await applyExternalSpecializedPackActivation(
        { root: projectRoot, activation, approval, declaredLicense: "MIT" },
        fs,
      );
      expect(first.status).toBe("applied");
      expect(second.status).toBe("already-applied");
      expect(second.writes).toBe(0);
    });

    it("returns conflict for same id with different pin", async () => {
      const preview = readyPreviewViewModel();
      const result = await activateExternalSpecializedPackFromApproval({
        root: projectRoot,
        input: readyInput(),
        preview,
        approval: buildExternalSpecializedPackActivationApproval(preview),
        client: mockActivateClient(
          appliedResult({
            status: "conflict",
            writes: 0,
            changedPaths: [],
            diagnostics: ["conflicting pin"],
          }),
        ),
      });
      expect(result.status).toBe("conflict");
    });
  });

  describe("security and tampering", () => {
    it("denies tampered approval through daemon apply semantics", async () => {
      const manifest = externalManifest();
      const preview = previewExternalSpecializedPack(previewInput(manifest));
      expect(() =>
        activateExternalSpecializedPack(preview, {
          schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
          decision: "approve",
          reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
          source: {
            ...preview.source,
            pin: "tampered-pin",
          },
        }),
      ).toThrow(/does not match/i);
    });

    it("blocks activation before RPC when review is stale", () => {
      const preview = readyPreviewViewModel();
      const snapshot = reviewSnapshot();
      const edited = { ...snapshot.input, sourcePin: "changed" };
      expect(
        canActivateExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "ready-for-review",
          preview,
          snapshot,
          input: edited,
          approval: buildExternalSpecializedPackActivationApproval(preview),
          activationState: "approved",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("blocks rejected unsafe network.connect preview activation", () => {
      const manifest = externalManifest({
        permissionsRequired: ["network.connect"],
      });
      const previewVm = buildExternalSpecializedPackPreviewViewModel(
        previewExternalSpecializedPack(previewInput(manifest)),
      );
      expect(previewVm.status).toBe("rejected");
      expect(
        canApproveExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "rejected",
          preview: previewVm,
          snapshot: reviewSnapshot(projectRoot, readyInput(manifest)),
          input: readyInput(manifest),
          activationState: "idle",
          daemonConnected: true,
        }),
      ).toBe(false);
    });
  });

  describe("Tauri boundary", () => {
    it("allowlists preview and activate RPC separately", () => {
      const allowlist = readFileSync(
        join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
        "utf8",
      );
      const mainRs = readFileSync(
        join(desktopRoot, "src-tauri/src/main.rs"),
        "utf8",
      );
      expect(allowlist).toContain("is_specialized_pack_preview_method");
      expect(allowlist).toContain("is_specialized_pack_activate_method");
      expect(mainRs).toContain("invoke_specialized_pack_preview_request");
      expect(mainRs).toContain("invoke_specialized_pack_activate_request");
      expect(mainRs).not.toContain("invoke_daemon_request");
    });

    it("exposes preview and activate on desktop client only", () => {
      expect(
        Object.keys(specializedPackExternalDesktopMethods()).sort(),
      ).toEqual(
        [
          "specializedPacksExternalActivate",
          "specializedPacksExternalPreview",
        ].sort(),
      );
    });

    it("does not add generic mutation bridge", () => {
      const commands = readFileSync(
        join(desktopRoot, "src-tauri/src/commands.rs"),
        "utf8",
      );
      expect(commands).not.toMatch(/invoke_.*daemon.*request/u);
      expect(commands).not.toContain("invoke_mutating_request");
    });
  });

  describe("Doctor and operation lifecycle", () => {
    it("parses canonical apply viewmodel for doctor refresh consumers", () => {
      const manifest = externalManifest();
      const preview = previewExternalSpecializedPack(previewInput(manifest));
      const activation = activateExternalSpecializedPack(preview, {
        schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
        decision: "approve",
        reviewerId: DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID,
        source: preview.source,
      });
      const apply = buildExternalSpecializedPackApplyViewModel({
        status: "applied",
        projectRoot,
        extensionId: activation.manifest.id,
        digest: activation.digest,
        pin: activation.source.pin,
        changedPaths: [".aif/extension-lock.json"],
        writes: 1,
        diagnostics: [],
        rollbackAttempted: false,
        rollbackCompleted: true,
        rollbackFailures: [],
      });
      const parsed = parseExternalSpecializedPackApplyViewModel(apply);
      expect(parsed.status).toBe("applied");
    });

    it("disables activate while applying", () => {
      expect(
        canActivateExternalSpecializedPack({
          root: projectRoot,
          previewStatus: "ready-for-review",
          preview: readyPreviewViewModel(),
          snapshot: reviewSnapshot(),
          input: readyInput(),
          approval: buildExternalSpecializedPackActivationApproval(
            readyPreviewViewModel(),
          ),
          activationState: "applying",
          daemonConnected: true,
        }),
      ).toBe(false);
    });

    it("ignores stale activation responses after root switch", async () => {
      const preview = readyPreviewViewModel();
      const result = await activateExternalSpecializedPackFromApproval({
        root: "/project-b",
        input: readyInput(),
        preview,
        approval: buildExternalSpecializedPackActivationApproval(preview),
        client: mockActivateClient(appliedResult()),
        requestRoot: "/project-a",
      });
      expect(result.status).toBe("stale-root");
      expect(result.result).toBeNull();
    });
  });

  describe("rendering safeguards", () => {
    it("keeps approval UI ids explicit and manifest-independent", () => {
      const approvalPanel = readFileSync(
        join(desktopRoot, "src/views/ExternalSpecializedPackApprovalPanel.tsx"),
        "utf8",
      );
      expect(approvalPanel).toContain('id="external-pack-approve"');
      expect(approvalPanel).toContain('id="external-pack-activate"');
      expect(approvalPanel).not.toContain("dangerouslySetInnerHTML");
    });

    it("preserves digest from fixture manifest", () => {
      const manifest = externalManifest();
      const digest = computeExternalSpecializedPackDigest(manifest);
      expect(readyPreviewViewModel().digest).toBe(digest);
    });
  });

  describe("S8f1 preview regression", () => {
    it("still loads ready-for-review preview", async () => {
      const viewmodel = readyPreviewViewModel();
      const result = await loadExternalSpecializedPackPreview({
        root: projectRoot,
        input: readyInput(),
        client: mockPreviewClient(viewmodel),
      });
      expect(result.status).toBe("ready-for-review");
    });

    it("matches preview protocol parser parity", () => {
      const viewmodel = readyPreviewViewModel();
      expect(
        parseExternalSpecializedPackPreviewViewModel(viewmodel).digest,
      ).toBe(viewmodel.digest);
    });
  });
});
