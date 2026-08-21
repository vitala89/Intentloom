import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  buildExternalSpecializedPackPreviewViewModel,
  computeExternalSpecializedPackDigest,
  previewExternalSpecializedPack,
} from "@intentloom/application";
import {
  parseExternalSpecializedPackPreviewViewModel,
  type ExternalSpecializedPackPreviewViewModel,
  type DoctorFinding,
} from "@intentloom/protocol";
import { specializedPackExternalDesktopMethods } from "../apps/desktop/src/desktop-client-specialized-pack-external.js";
import {
  EXTERNAL_SPECIALIZED_PACK_ACTIVATE_ACTION_ID,
  EXTERNAL_SPECIALIZED_PACK_APPROVE_ACTION_ID,
  loadExternalSpecializedPackPreview,
  renderExternalSpecializedPackPreviewFields,
  sanitizeUntrustedDisplayText,
} from "../apps/desktop/src/views/specialized-pack-external-preview-controller.js";
import {
  EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
  shouldClearExternalSpecializedPackPreview,
} from "../apps/desktop/src/views/specialized-pack-external-preview-types.js";
import { hasExternalSpecializedPackDoctorFindings } from "../apps/desktop/src/views/specialized-pack-external-doctor.js";
import { buildWorkspaceCommandOptions } from "../apps/desktop/src/workspace-command-options.js";
import {
  externalManifest,
  previewInput,
} from "./specialized-pack-s8e-doctor-fixture.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function readyPreviewViewModel(): ExternalSpecializedPackPreviewViewModel {
  const manifest = externalManifest({
    name: "<script>alert(1)</script>",
    publisher: "Example Org",
  });
  const preview = previewExternalSpecializedPack(previewInput(manifest));
  return buildExternalSpecializedPackPreviewViewModel(preview);
}

function mockClient(
  implementation: ExternalSpecializedPackPreviewViewModel | Error,
) {
  return {
    specializedPacksExternalPreview: vi.fn(async () => {
      if (implementation instanceof Error) throw implementation;
      return implementation;
    }),
  };
}

describe("S8f1 Desktop external specialized pack preview", () => {
  describe("controller", () => {
    it("starts idle without a project root", async () => {
      const result = await loadExternalSpecializedPackPreview({
        root: null,
        input: EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
        client: mockClient(readyPreviewViewModel()),
      });
      expect(result.status).toBe("idle");
      expect(result.preview).toBeNull();
      expect(result.invokedMethods).toEqual([]);
    });

    it("loads ready-for-review from a valid preview request", async () => {
      const viewmodel = readyPreviewViewModel();
      const result = await loadExternalSpecializedPackPreview({
        root: "/project",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
          declaredPublisher: "Example Org",
          sourceDigest: viewmodel.digest,
        },
        client: mockClient(viewmodel),
      });
      expect(result.status).toBe("ready-for-review");
      expect(result.preview?.packId).toBe(viewmodel.packId);
    });

    it("transitions to rejected for rejected preview status", async () => {
      const viewmodel = {
        ...readyPreviewViewModel(),
        status: "rejected" as const,
        diagnostics: ["forbidden permissions marker: network"],
      };
      const result = await loadExternalSpecializedPackPreview({
        root: "/project",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
        },
        client: mockClient(viewmodel),
      });
      expect(result.status).toBe("rejected");
      expect(result.preview?.diagnostics).toContain(
        "forbidden permissions marker: network",
      );
    });

    it("maps daemon errors to error state", async () => {
      const result = await loadExternalSpecializedPackPreview({
        root: "/project",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
        },
        client: mockClient(new Error("preview failed")),
      });
      expect(result.status).toBe("error");
      expect(result.errorMessage).toContain("preview failed");
    });

    it("maps disconnected bridge errors", async () => {
      const error = Object.assign(new Error("disconnected"), {
        code: "disconnected",
      });
      const result = await loadExternalSpecializedPackPreview({
        root: "/project",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
        },
        client: mockClient(error),
      });
      expect(result.status).toBe("disconnected");
    });

    it("maps cancellation to cancelled state", async () => {
      const error = Object.assign(new Error("Operation cancelled"), {
        code: "cancelled",
      });
      const result = await loadExternalSpecializedPackPreview({
        root: "/project",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
        },
        client: mockClient(error),
      });
      expect(result.status).toBe("cancelled");
    });

    it("ignores stale late responses after root switch", async () => {
      const viewmodel = readyPreviewViewModel();
      const result = await loadExternalSpecializedPackPreview({
        root: "/project-b",
        input: {
          ...EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
          manifestJson: "{}",
        },
        client: mockClient(viewmodel),
        requestRoot: "/project-a",
      });
      expect(result.status).toBe("stale-root");
      expect(result.preview).toBeNull();
    });

    it("clears preview when selected root changes", () => {
      expect(shouldClearExternalSpecializedPackPreview("/a", "/b")).toBe(true);
      expect(shouldClearExternalSpecializedPackPreview("/a", "/a")).toBe(false);
      expect(shouldClearExternalSpecializedPackPreview("/a", null)).toBe(true);
    });
  });

  describe("semantic parity", () => {
    it("matches daemon/application preview viewmodel fields", () => {
      const manifest = externalManifest();
      const preview = previewExternalSpecializedPack(previewInput(manifest));
      const applicationViewmodel =
        buildExternalSpecializedPackPreviewViewModel(preview);
      const protocolViewmodel =
        parseExternalSpecializedPackPreviewViewModel(applicationViewmodel);
      expect(protocolViewmodel.digest).toBe(applicationViewmodel.digest);
      expect(protocolViewmodel.trustLevel).toBe(
        applicationViewmodel.trustLevel,
      );
      expect(protocolViewmodel.diagnostics).toEqual(
        applicationViewmodel.diagnostics,
      );
      expect(protocolViewmodel.compatible).toBe(
        applicationViewmodel.compatible,
      );
      expect(protocolViewmodel.source.pin).toBe(
        applicationViewmodel.source.pin,
      );
    });

    it("preserves canonical digest from fixture manifest", () => {
      const manifest = externalManifest();
      const digest = computeExternalSpecializedPackDigest(manifest);
      const viewmodel = buildExternalSpecializedPackPreviewViewModel(
        previewExternalSpecializedPack(previewInput(manifest)),
      );
      expect(viewmodel.digest).toBe(digest);
    });
  });

  describe("security rendering", () => {
    it("renders HTML-like manifest text as sanitized plain text", () => {
      const viewmodel = readyPreviewViewModel();
      const fields = renderExternalSpecializedPackPreviewFields(viewmodel);
      const nameField = fields.find((field) =>
        field.label.includes("Name declared"),
      );
      expect(nameField?.value).toContain("<script>alert(1)</script>");
      expect(nameField?.value).not.toMatch(/dangerouslySetInnerHTML/u);
    });

    it("does not treat markdown-like content as markup", () => {
      const rendered = sanitizeUntrustedDisplayText("# approve now\n**click**");
      expect(rendered).toContain("# approve now");
      expect(rendered).toContain("**click**");
      expect(rendered).not.toMatch(/<[^>]+>/u);
    });

    it("strips control characters without changing digest display semantically", () => {
      const rendered = sanitizeUntrustedDisplayText(
        "sha256:aaaaaaaa\u0007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      );
      expect(rendered).not.toContain("\u0007");
      expect(rendered.startsWith("sha256:a")).toBe(true);
    });

    it("truncates oversized visible strings", () => {
      const rendered = sanitizeUntrustedDisplayText("x".repeat(600), 128);
      expect(rendered.endsWith("…")).toBe(true);
      expect(rendered.length).toBeLessThanOrEqual(129);
    });
  });

  describe("UI capability boundaries", () => {
    it("does not expose command palette approve/activate shortcuts", () => {
      expect(EXTERNAL_SPECIALIZED_PACK_APPROVE_ACTION_ID).toBe(
        "approve-external-specialized-pack",
      );
      expect(EXTERNAL_SPECIALIZED_PACK_ACTIVATE_ACTION_ID).toBe(
        "activate-external-specialized-pack",
      );
      const commandOptions = buildWorkspaceCommandOptions({
        theme: "dark",
        setActiveView: () => undefined,
        requestProjectSelect: () => undefined,
        connectDaemon: () => undefined,
        loadDiff: () => undefined,
        loadTimeline: () => undefined,
        setTheme: () => undefined,
      });
      const ids = commandOptions.map((option) => option.id);
      expect(ids).not.toContain(EXTERNAL_SPECIALIZED_PACK_APPROVE_ACTION_ID);
      expect(ids).not.toContain(EXTERNAL_SPECIALIZED_PACK_ACTIVATE_ACTION_ID);
    });

    it("does not add file-picker or network commands", () => {
      const rustCommands = readFileSync(
        join(desktopRoot, "src-tauri/src/main.rs"),
        "utf8",
      );
      expect(rustCommands).toContain("invoke_specialized_pack_preview_request");
      expect(rustCommands).toContain(
        "invoke_specialized_pack_activate_request",
      );
      expect(rustCommands).not.toContain("pick_file");
      const pageSource = readFileSync(
        join(desktopRoot, "src/views/ExternalSpecializedPackApprovalPanel.tsx"),
        "utf8",
      );
      expect(pageSource).toContain("Approve for activation");
      expect(pageSource).toContain("Activate approved pack");
      expect(pageSource).not.toContain("dangerouslySetInnerHTML");
      const previewPage = readFileSync(
        join(desktopRoot, "src/views/ExternalSpecializedPackPreviewPage.tsx"),
        "utf8",
      );
      expect(previewPage).not.toMatch(/fetch\(/u);
    });

    it("registers command palette entry without sidebar nav item", () => {
      const commandOptions = buildWorkspaceCommandOptions({
        theme: "dark",
        setActiveView: () => undefined,
        requestProjectSelect: () => undefined,
        connectDaemon: () => undefined,
        loadDiff: () => undefined,
        loadTimeline: () => undefined,
        setTheme: () => undefined,
      });
      expect(
        commandOptions.some(
          (option) => option.id === "action-external-specialized-pack-preview",
        ),
      ).toBe(true);
      const navigation = readFileSync(
        join(desktopRoot, "src/workspace-navigation.ts"),
        "utf8",
      );
      expect(navigation).toContain("External specialized pack review");
      expect(
        navigation.match(/External specialized pack review/g)?.length,
      ).toBe(1);
    });
  });

  describe("Doctor integration", () => {
    it("detects S8e external specialized-pack doctor findings", () => {
      const findings: DoctorFinding[] = [
        {
          code: "specialized-pack-lock-invalid",
          category: "extensions",
          severity: "error",
          path: ".aif/extension-lock.json",
          message: "invalid",
        },
      ];
      expect(hasExternalSpecializedPackDoctorFindings(findings)).toBe(true);
      expect(
        hasExternalSpecializedPackDoctorFindings([
          { ...findings[0]!, code: "installation-healthy" },
        ]),
      ).toBe(false);
    });

    it("links Doctor view to external pack review action", () => {
      const doctorView = readFileSync(
        join(desktopRoot, "src/views/DoctorView.tsx"),
        "utf8",
      );
      expect(doctorView).toContain("Review external specialized pack");
      expect(doctorView).toContain("hasExternalSpecializedPackDoctorFindings");
    });
  });

  describe("desktop client wrapper", () => {
    it("uses dedicated preview and activate Tauri invoke commands", () => {
      const clientSource = readFileSync(
        join(desktopRoot, "src/desktop-client-specialized-pack-external.ts"),
        "utf8",
      );
      expect(clientSource).toContain("invoke_specialized_pack_preview_request");
      expect(clientSource).toContain(
        "invoke_specialized_pack_activate_request",
      );
      expect(
        Object.keys(specializedPackExternalDesktopMethods()).sort(),
      ).toEqual(
        [
          "specializedPacksExternalActivate",
          "specializedPacksExternalPreview",
        ].sort(),
      );
    });

    it("allowlists preview and activate RPC at Rust boundary", () => {
      const allowlist = readFileSync(
        join(desktopRoot, "src-tauri/src/method_allowlist.rs"),
        "utf8",
      );
      expect(allowlist).toContain("specialized-packs.external.preview.v1");
      expect(allowlist).toContain("is_specialized_pack_activate_method");
      expect(allowlist).toContain(
        '"intentloom.specialized-packs.external.activate.v1"',
      );
      expect(allowlist).toContain("assert!(!is_foundation_method(");
    });
  });
});
