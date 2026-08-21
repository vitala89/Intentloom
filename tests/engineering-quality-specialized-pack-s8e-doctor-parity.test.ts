import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { doctorProject } from "@intentloom/application";
import { SPECIALIZED_PACK_INTEGRITY_INVALID } from "@intentloom/application";
import { createDoctorRequest } from "@intentloom/protocol";
import { handleProjectDoctorRequest } from "../packages/daemon/src/project-health-handlers.js";
import { runCli } from "../packages/cli/src/command.js";
import {
  adoptedProject,
  applyActivatedPack,
  doctorInit,
  findingCodes,
  projectFs,
  tamperLockEntry,
} from "./specialized-pack-s8e-doctor-fixture.js";

const catalogRoot = resolve("catalog");

function findingSignature(
  findings: readonly {
    readonly code: string;
    readonly severity: string;
    readonly path: string;
  }[],
) {
  return findings
    .filter((finding) => finding.code.startsWith("specialized-pack-"))
    .map((finding) => `${finding.code}:${finding.severity}:${finding.path}`)
    .toSorted((left, right) => left.localeCompare(right));
}

describe("S8e Doctor CLI/daemon/Desktop parity", () => {
  it("exposes the same specialized-pack finding codes on CLI, daemon, and Desktop", async () => {
    const fs = await adoptedProject(projectFs());
    await applyActivatedPack(fs);
    await tamperLockEntry(fs, (entry) => ({
      ...entry,
      integrity: "sha256:not-a-digest",
    }));

    const application = await doctorProject(doctorInit, fs);
    const daemon = await handleProjectDoctorRequest(
      createDoctorRequest("doctor-s8e", { root: "/project" }),
      catalogRoot,
      fs,
    );
    const stdout: string[] = [];
    const exitCode = await runCli(
      ["doctor", "--root", "/project", "--json"],
      { catalogRoot, fileSystem: fs },
      {
        stdout: (message) => stdout.push(message),
        stderr: () => {},
      },
    );
    const cli = JSON.parse(stdout.join("\n")) as {
      readonly findings: readonly {
        readonly code: string;
        readonly severity: string;
        readonly path: string;
      }[];
    };

    expect(findingCodes(application)).toContain(
      SPECIALIZED_PACK_INTEGRITY_INVALID,
    );
    expect(findingSignature(application.findings)).toEqual(
      findingSignature(daemon.findings),
    );
    expect(findingSignature(application.findings)).toEqual(
      findingSignature(cli.findings),
    );
    expect(exitCode).toBe(3);
    expect(daemon.exitCode).toBe(3);
  });
});
