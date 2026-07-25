import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createProfile,
  delegateTaskRole,
  getProfile,
  listProfiles,
} from "@intentloom/application";
import {
  validateDelegationRequest,
  validateDelegationResult,
  validateProfileDefinition,
  type ProfileDefinition,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L8 — Profile Isolation and Role-Aware Delegation", () => {
  const sampleProfile: ProfileDefinition = {
    schemaVersion: "1",
    name: "dev-profile",
    description: "Standard developer workspace profile",
    allowedCapabilities: {
      readOnly: false,
      allowedPaths: ["src/"],
      allowedTools: ["git", "pnpm"],
      maxBudget: 50,
      allowNetwork: false,
    },
    activeRoles: ["context-scout", "feature-builder", "reviewer"],
    createdAt: "2026-07-26T00:00:00.000Z",
  };

  it("validates profile definition and delegation schemas", () => {
    const validatedProfile = validateProfileDefinition(sampleProfile);
    expect(validatedProfile.name).toBe("dev-profile");
    expect(validatedProfile.activeRoles.length).toBe(3);

    const validReq = validateDelegationRequest({
      schemaVersion: "1",
      profileName: "dev-profile",
      role: "context-scout",
      parentTaskId: "task-501",
    });
    expect(validReq.role).toBe("context-scout");

    const validRes = validateDelegationResult({
      schemaVersion: "1",
      delegationId: "del-001",
      grantedRole: "context-scout",
      effectiveCapabilities: {
        readOnly: true,
        allowedPaths: ["src/"],
        allowedTools: ["git"],
        maxBudget: 50,
        allowNetwork: false,
      },
      deniedCapabilities: [],
      createdAt: "2026-07-26T00:00:00.000Z",
    });
    expect(validRes.grantedRole).toBe("context-scout");
  });

  it("creates, retrieves, and lists profile definitions", async () => {
    const fs = createMemoryFileSystem();
    const created = await createProfile(
      sampleProfile,
      { root: "/project" },
      fs,
    );
    expect(created.name).toBe("dev-profile");

    const retrieved = await getProfile("dev-profile", { root: "/project" }, fs);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("dev-profile");

    const profiles = await listProfiles({ root: "/project" }, fs);
    expect(profiles.length).toBe(1);
    expect(profiles[0]!.name).toBe("dev-profile");
  });

  it("clamps subagent capabilities and denies scope widening", async () => {
    const fs = createMemoryFileSystem();
    await createProfile(sampleProfile, { root: "/project" }, fs);

    // Request feature-builder with network access (profile disallows network)
    const delegation = await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "dev-profile",
        role: "feature-builder",
        requestedCapabilities: {
          allowNetwork: true,
          maxBudget: 200,
        },
        parentTaskId: "task-502",
      },
      { root: "/project" },
      fs,
    );

    expect(delegation.grantedRole).toBe("feature-builder");
    expect(delegation.effectiveCapabilities.allowNetwork).toBe(false);
    expect(delegation.effectiveCapabilities.maxBudget).toBe(50);
    expect(delegation.deniedCapabilities.length).toBe(1);
  });

  it("enforces read-only protection for context-scout and reviewer roles", async () => {
    const fs = createMemoryFileSystem();
    await createProfile(sampleProfile, { root: "/project" }, fs);

    const scoutDelegation = await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "dev-profile",
        role: "context-scout",
        requestedCapabilities: {
          readOnly: false,
        },
        parentTaskId: "task-503",
      },
      { root: "/project" },
      fs,
    );

    expect(scoutDelegation.effectiveCapabilities.readOnly).toBe(true);
    expect(scoutDelegation.deniedCapabilities.length).toBe(1);

    const reviewerDelegation = await delegateTaskRole(
      {
        schemaVersion: "1",
        profileName: "dev-profile",
        role: "reviewer",
        parentTaskId: "task-504",
      },
      { root: "/project" },
      fs,
    );

    expect(reviewerDelegation.effectiveCapabilities.readOnly).toBe(true);
  });

  it("executes CLI intentloom profile and delegate commands", async () => {
    const fs = createMemoryFileSystem();

    const profileOutput: string[] = [];
    const profileExit = await runCli(
      [
        "profile",
        "create",
        "--root",
        "/project",
        "--name",
        "cli-profile",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => profileOutput.push(msg), stderr: () => undefined },
    );

    expect(profileExit).toBe(0);
    const createdProf = JSON.parse(profileOutput.join("\n"));
    expect(createdProf.name).toBe("cli-profile");

    const delegateOutput: string[] = [];
    const delegateExit = await runCli(
      [
        "delegate",
        "--root",
        "/project",
        "--profile",
        "cli-profile",
        "--role",
        "context-scout",
        "--task-id",
        "task-601",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => delegateOutput.push(msg), stderr: () => undefined },
    );

    expect(delegateExit).toBe(0);
    const delegation = JSON.parse(delegateOutput.join("\n"));
    expect(delegation.grantedRole).toBe("context-scout");
    expect(delegation.effectiveCapabilities.readOnly).toBe(true);
  });
});
