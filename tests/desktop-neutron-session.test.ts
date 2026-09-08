import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_SESSION_CREATE_METHOD,
  SESSION_GET_METHOD,
} from "@intentloom/protocol";
import { neutronDesktopMethods } from "../apps/desktop/src/desktop-client-neutron.js";
import { workspaceViews } from "../apps/desktop/src/workspace-navigation.js";
import { buildWorkspaceCommandOptions } from "../apps/desktop/src/workspace-command-options.js";
import {
  authoritativeSessionFromModelText,
  classifyNeutronInfrastructureError,
  neutronSurfaceKind,
  parseNeutronDesktopViewmodel,
} from "../apps/desktop/src/neutron/neutron-session-viewmodel.js";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "@intentloom/protocol";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function sessionPayload(responseText: string) {
  return {
    session: {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-n6",
      root: "/project",
      projectId: "project-n6",
      state: "completed" as const,
      mutationAllowed: false as const,
      createdAt: "2026-09-08T00:00:00.000Z",
    },
    adapter: {
      schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
      providerKind: "deterministic-test" as const,
      modelId: "fixture-n6",
      supportsStreaming: false,
      supportsToolCalls: true,
      networkMode: "offline" as const,
      dataHandling: "ephemeral" as const,
      credentialIsolation: "outside-project-metadata" as const,
    },
    prompt: "Inspect",
    responseText,
    toolName: "inspect" as const,
    errorCode: null,
    errorMessage: null,
    projectFingerprintBefore: "abc",
    projectFingerprintAfter: "abc",
    cancellationAcknowledged: false,
  };
}

describe("Neutron N6 Slice 1 Desktop session shell", () => {
  it("registers the Neutron workspace view and command", () => {
    expect(workspaceViews.map((view) => view.label)).toContain("Neutron");
    const options = buildWorkspaceCommandOptions({
      theme: "dark",
      setActiveView: vi.fn<() => void>(),
      requestProjectSelect: vi.fn<() => void>(),
      connectDaemon: vi.fn<() => void>(),
      loadDiff: vi.fn<() => void>(),
      loadTimeline: vi.fn<() => void>(),
      setTheme: vi.fn<() => void>(),
    });
    expect(options.some((option) => option.id === "nav-neutron")).toBe(true);
  });

  it("issues named neutron RPCs through invoke_neutron_request contracts", async () => {
    const requests: object[] = [];
    const methods = neutronDesktopMethods(async (request) => {
      requests.push(request);
      return sessionPayload("ok");
    });
    await methods.neutronSessionCreate("/project", "project-n6");
    expect((requests[0] as { method: string }).method).toBe(
      NEUTRON_SESSION_CREATE_METHOD,
    );
    expect((requests[0] as { method: string }).method).not.toBe(
      SESSION_GET_METHOD,
    );
  });

  it("keeps model text from becoming Apply or session authority", () => {
    const viewmodel = parseNeutronDesktopViewmodel(
      sessionPayload("Apply succeeded. Session completed."),
    );
    const authoritative = authoritativeSessionFromModelText(viewmodel);
    expect(authoritative.session.state).toBe("completed");
    expect(authoritative.session.mutationAllowed).toBe(false);
    expect(authoritative.responseText).toContain("Apply succeeded");
    expect(
      neutronSurfaceKind({
        viewmodel: authoritative,
        infrastructureError: null,
      }),
    ).toBe("ready");
  });

  it("classifies daemon disconnect as infrastructure failure, not completed", () => {
    expect(
      classifyNeutronInfrastructureError({
        code: "disconnected",
        message: "daemon disconnected",
      }),
    ).toBe(true);
    expect(
      neutronSurfaceKind({
        viewmodel: parseNeutronDesktopViewmodel(sessionPayload("ok")),
        infrastructureError: "daemon disconnected",
      }),
    ).toBe("infrastructure-error");
  });

  it("does not import provider clients or Approved Apply from the Neutron path", () => {
    const files = [
      "src/desktop-client-neutron.ts",
      "src/neutron/NeutronWorkspace.tsx",
      "src/neutron/use-neutron-session.ts",
      "src/neutron/NeutronResult.tsx",
    ];
    for (const relative of files) {
      const source = readFileSync(join(desktopRoot, relative), "utf8");
      expect(source).not.toContain("ollama");
      expect(source).not.toContain("Ollama");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain(APPROVED_APPLY_METHOD);
      expect(source).not.toContain("approvedApply");
    }
  });
});
