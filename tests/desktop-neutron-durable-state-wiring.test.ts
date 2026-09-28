import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NEUTRON_READ_ONLY_TOOLS } from "@intentloom/protocol";
import {
  desktopOwnedDaemonLaunchArgs,
  NEUTRON_MUTATION_STATE_DIR_FLAG,
} from "../scripts/desktop/daemon-launch-args.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const desktopSrc = join(root, "apps/desktop/src");

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

describe("Desktop Neutron durable-state host wiring", () => {
  it("requires Desktop-owned launch compositions to supply the trusted directory", () => {
    const args = desktopOwnedDaemonLaunchArgs({
      endpoint: "/tmp/daemon.sock",
      tokenFile: "/tmp/session.token",
      catalogRoot: "/repo/catalog",
      neutronMutationStateDir: "/app-data/neutron-mutation-state",
    });
    expect(args).toEqual([
      "--endpoint",
      "/tmp/daemon.sock",
      "--token-file",
      "/tmp/session.token",
      "--catalog-root",
      "/repo/catalog",
      NEUTRON_MUTATION_STATE_DIR_FLAG,
      "/app-data/neutron-mutation-state",
    ]);
    expect(() =>
      desktopOwnedDaemonLaunchArgs({
        endpoint: "/tmp/daemon.sock",
        tokenFile: "/tmp/session.token",
        catalogRoot: "/repo/catalog",
        neutronMutationStateDir: " ",
      }),
    ).toThrow("neutron mutation state directory is required");
  });

  it("keeps packaged SEA launch aligned with the Desktop sidecar contract", () => {
    const sea = readFileSync(
      join(root, "scripts/desktop/sea-runtime.mjs"),
      "utf8",
    );
    const rust = readFileSync(
      join(root, "apps/desktop/src-tauri/src/daemon_runtime.rs"),
      "utf8",
    );
    expect(sea).toContain("desktopOwnedDaemonLaunchArgs");
    expect(sea).toContain("neutron-mutation-state");
    expect(rust).toContain("desktop_owned_daemon_args");
    expect(rust).toContain("neutron_mutation_state_dir");
    expect(rust).not.toMatch(/remove_.*neutron_mutation_state/);
    expect(
      existsSync(join(root, "scripts/desktop/daemon-launch-args.mjs")),
    ).toBe(true);
  });

  it("does not let the renderer choose or observe the durable-state path", () => {
    const files = collectSourceFiles(desktopSrc);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain(NEUTRON_MUTATION_STATE_DIR_FLAG);
      expect(source).not.toContain("durableStateDirectory");
      expect(source).not.toContain("neutron-mutation-state");
      expect(source).not.toContain("approveAndApply");
      expect(source).not.toContain("applyApprovedNeutronMutation");
    }
  });

  it("does not add mutation RPC, Apply, or an N4 mutation tool", () => {
    expect(NEUTRON_READ_ONLY_TOOLS).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
    const protocol = readFileSync(
      join(root, "packages/protocol/src/jsonrpc.ts"),
      "utf8",
    );
    expect(protocol).not.toContain("approveAndApply");
    expect(protocol).not.toContain("mutation.approveAndApply");
  });
});
