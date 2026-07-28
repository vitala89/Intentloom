import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  initProject,
  inspectProject,
  doctorProject,
  getInteractiveWorkspaceState,
} from "@intentloom/application";

describe("v1.0 Client-Surface Readiness & Equivalence (V1_0_STABLE_COMPATIBILITY_PLAN Phase 3)", () => {
  it("guarantees typed equivalence between application operations and workspace state payload", async () => {
    const fs = createMemoryFileSystem();
    const root = "/equivalence-project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const directInspect = await inspectProject(root, fs);
    const directDoctor = await doctorProject(
      { root, profile: "generic", adapters: ["codex"] },
      fs,
    );
    const state = await getInteractiveWorkspaceState(
      { root, projectId: "eq-test" },
      fs,
    );

    expect(state.inspect?.profileDetection.selectedProfile).toBe(
      directInspect.profileDetection.selectedProfile,
    );
    expect(state.inspect?.detectedAdapters).toEqual(
      directInspect.detectedAdapters,
    );
    expect(state.findings.length).toBe(directDoctor.findings.length);
  });

  it("verifies zero-mutation guarantees across multi-client inspection workflows", async () => {
    const fs = createMemoryFileSystem();
    const root = "/zero-mutation-project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const initialFiles = new Map(fs.files);

    // Perform multiple state queries representing CLI, TUI, MCP, and Desktop
    await inspectProject(root, fs);
    await doctorProject({ root, profile: "generic", adapters: ["codex"] }, fs);
    await getInteractiveWorkspaceState({ root, projectId: "test" }, fs);

    expect(fs.files.size).toBe(initialFiles.size);
    for (const [path, content] of initialFiles) {
      expect(fs.files.get(path)).toBe(content);
    }
  });
});
