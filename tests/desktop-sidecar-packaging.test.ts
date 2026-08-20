import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPackagingSidecar,
  inspectPackagedMacosApp,
  inspectSidecar,
  packagedCatalogCandidates,
  packagedSidecarCandidates,
  removeStaleSidecar,
  sidecarResourcePath,
  writeSidecarStamp,
} from "../scripts/desktop/sidecar-contract.mjs";

const MIN = 8;

function nativeHeader() {
  if (process.platform === "darwin")
    return Buffer.from([0xcf, 0xfa, 0xed, 0xfe]);
  if (process.platform === "win32")
    return Buffer.from([0x4d, 0x5a, 0x00, 0x00]);
  return Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
}

async function fakeRepo() {
  const root = await mkdtemp(join(tmpdir(), "intentloom-sidecar-"));
  await mkdir(join(root, "apps/desktop/src-tauri/resources"), {
    recursive: true,
  });
  await mkdir(join(root, "packages/daemon/dist"), { recursive: true });
  const bundle = join(root, "packages/daemon/dist/intentloomd.cjs");
  await writeFile(bundle, "daemon-bundle\n");
  return { root, bundle, sidecar: sidecarResourcePath(root) };
}

async function writeNativeSidecar(path) {
  await writeFile(path, Buffer.concat([nativeHeader(), Buffer.alloc(12, 1)]));
  if (process.platform !== "win32") await chmod(path, 0o755);
}

describe("desktop sidecar packaging contract", () => {
  it("rejects a missing sidecar with an explicit path", async () => {
    const { sidecar } = await fakeRepo();
    const result = await inspectSidecar(sidecar, { minBytes: MIN });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("sidecar_missing");
    expect(result.message).toContain("packaged daemon executable not found");
  });

  it("requires the Unix executable bit", async () => {
    if (process.platform === "win32") return;
    const { sidecar } = await fakeRepo();
    await writeNativeSidecar(sidecar);
    await chmod(sidecar, 0o644);
    const result = await inspectSidecar(sidecar, { minBytes: MIN });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("sidecar_not_executable");
  });

  it("rejects a Node shebang script instead of silently packaging it", async () => {
    const { sidecar } = await fakeRepo();
    await writeFile(sidecar, "#!/usr/bin/env node\nconsole.log(1)\n");
    if (process.platform !== "win32") await chmod(sidecar, 0o755);
    const result = await inspectSidecar(sidecar, { minBytes: MIN });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("sidecar_script");
    expect(result.message).toContain("script, not a self-contained executable");
  });

  it("requires a freshly stamped sidecar matching the current daemon bundle", async () => {
    const { root, bundle, sidecar } = await fakeRepo();
    await expect(
      assertPackagingSidecar({
        repositoryRoot: root,
        daemonBundlePath: bundle,
        minBytes: MIN,
      }),
    ).rejects.toThrow(/stamp not found|executable not found/);
    await writeNativeSidecar(sidecar);
    await writeSidecarStamp({
      repositoryRoot: root,
      sidecarPath: sidecar,
      daemonBundlePath: bundle,
      createdBy: "test",
      minBytes: MIN,
    });
    const ready = await assertPackagingSidecar({
      repositoryRoot: root,
      daemonBundlePath: bundle,
      minBytes: MIN,
    });
    expect(ready.sidecar.ok).toBe(true);
    expect(ready.stamp.createdBy).toBe("test");
  });

  it("does not reuse a stale resource after the daemon bundle changes", async () => {
    const { root, bundle, sidecar } = await fakeRepo();
    await writeNativeSidecar(sidecar);
    await writeSidecarStamp({
      repositoryRoot: root,
      sidecarPath: sidecar,
      daemonBundlePath: bundle,
      createdBy: "test",
      minBytes: MIN,
    });
    await writeFile(bundle, "daemon-bundle-v2\n");
    await expect(
      assertPackagingSidecar({
        repositoryRoot: root,
        daemonBundlePath: bundle,
        minBytes: MIN,
      }),
    ).rejects.toThrow(/current daemon bundle/);
  });

  it("does not reuse a sidecar whose bytes no longer match the stamp", async () => {
    const { root, bundle, sidecar } = await fakeRepo();
    await writeNativeSidecar(sidecar);
    await writeSidecarStamp({
      repositoryRoot: root,
      sidecarPath: sidecar,
      daemonBundlePath: bundle,
      createdBy: "test",
      minBytes: MIN,
    });
    await writeFile(
      sidecar,
      Buffer.concat([nativeHeader(), Buffer.alloc(16, 2)]),
    );
    if (process.platform !== "win32") await chmod(sidecar, 0o755);
    await expect(
      assertPackagingSidecar({
        repositoryRoot: root,
        daemonBundlePath: bundle,
        minBytes: MIN,
      }),
    ).rejects.toThrow(/refusing to reuse a stale resource/);
  });

  it("clears a previous resource so packaging cannot silently reuse it", async () => {
    const { root, bundle, sidecar } = await fakeRepo();
    await writeNativeSidecar(sidecar);
    await writeSidecarStamp({
      repositoryRoot: root,
      sidecarPath: sidecar,
      daemonBundlePath: bundle,
      createdBy: "test",
      minBytes: MIN,
    });
    await removeStaleSidecar(root);
    await expect(
      assertPackagingSidecar({
        repositoryRoot: root,
        daemonBundlePath: bundle,
        minBytes: MIN,
      }),
    ).rejects.toThrow(/stamp not found|executable not found/);
  });

  it("matches packaged macOS sidecar and catalog lookup to the real bundle layout", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-app-"));
    const app = join(root, "Intentloom.app");
    const resources = join(app, "Contents/Resources");
    const sidecar = join(resources, "resources/intentloomd");
    const catalog = join(resources, "_up_/_up_/_up_/catalog");
    await mkdir(join(sidecar, ".."), { recursive: true });
    await mkdir(catalog, { recursive: true });
    await writeNativeSidecar(sidecar);
    const resourceDir = join(app, "Contents/Resources");
    expect(packagedSidecarCandidates(resourceDir, "darwin")[1]).toBe(sidecar);
    expect(packagedCatalogCandidates(resourceDir)[2]).toBe(catalog);
    const inspected = await inspectPackagedMacosApp(app, { minBytes: MIN });
    expect(inspected.ok).toBe(true);
    expect(inspected.catalog).toBe(catalog);
    expect(inspected.sidecar.path).toBe(sidecar);
  });
});
