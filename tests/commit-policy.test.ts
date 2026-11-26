import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateCommitMessage } from "../scripts/commit-policy.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const validateMessageScript = join(
  repoRoot,
  "scripts",
  "validate-commit-message.mjs",
);
const validateRangeScript = join(
  repoRoot,
  "scripts",
  "validate-commit-range.mjs",
);

const SYNTHETIC_CO_AUTHOR =
  "Co-authored-by: Synthetic Contributor <synthetic.coauthor@example.test>";
const SYNTHETIC_CO_AUTHOR_CAPS =
  "CO-AUTHORED-BY: Synthetic Contributor <synthetic.coauthor@example.test>";

function runValidateCommitMessageFile(message: string): {
  status: number | null;
  stderr: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "intentloom-commit-msg-"));
  const messagePath = join(dir, "COMMIT_EDITMSG");
  writeFileSync(messagePath, message, "utf8");
  try {
    execFileSync(process.execPath, [validateMessageScript, messagePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stderr: "" };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      status?: number;
      stderr?: string;
    };
    return {
      status: err.status ?? null,
      stderr: err.stderr?.toString() ?? "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("validateCommitMessage", () => {
  describe("allowed messages", () => {
    it("accepts a valid Conventional Commit without attribution", () => {
      expect(
        validateCommitMessage(
          "fix(governance): allow truthful co-authorship metadata",
        ),
      ).toEqual([]);
    });

    it("accepts one Co-authored-by trailer", () => {
      const message = [
        "fix(governance): allow truthful co-authorship metadata",
        "",
        SYNTHETIC_CO_AUTHOR,
      ].join("\n");
      expect(validateCommitMessage(message)).toEqual([]);
    });

    it("accepts multiple co-author trailers", () => {
      const message = [
        "fix(governance): allow truthful co-authorship metadata",
        "",
        SYNTHETIC_CO_AUTHOR,
        "Co-authored-by: Another Synthetic <another.synthetic@example.test>",
      ].join("\n");
      expect(validateCommitMessage(message)).toEqual([]);
    });

    it("accepts capitalization variants of the co-author trailer", () => {
      const message = [
        "fix(governance): allow truthful co-authorship metadata",
        "",
        SYNTHETIC_CO_AUTHOR_CAPS,
      ].join("\n");
      expect(validateCommitMessage(message)).toEqual([]);
    });

    it("accepts existing breaking-change syntax", () => {
      expect(
        validateCommitMessage("feat(protocol)!: change session envelope"),
      ).toEqual([]);
    });

    it("accepts generated merge messages", () => {
      expect(
        validateCommitMessage("Merge branch 'main' into fix/example"),
      ).toEqual([]);
    });

    it("accepts generated revert messages", () => {
      expect(
        validateCommitMessage('Revert "feat: add workspace palette"'),
      ).toEqual([]);
    });

    it("accepts a subject exactly at the 120-character limit", () => {
      const prefix = "fix(scope): ";
      const summary = "x".repeat(120 - prefix.length);
      const subject = `${prefix}${summary}`;
      expect(subject.length).toBe(120);
      expect(validateCommitMessage(subject)).toEqual([]);
    });
  });

  describe("rejected messages", () => {
    it("rejects an empty commit subject", () => {
      const errors = validateCommitMessage("\n");
      expect(errors.some((e) => e.includes("subject is empty"))).toBe(true);
    });

    it("rejects an unsupported Conventional Commit type", () => {
      const errors = validateCommitMessage("wibble(governance): invalid type");
      expect(errors.some((e) => e.includes("Conventional Commit type"))).toBe(
        true,
      );
    });

    it("rejects invalid subject syntax", () => {
      const errors = validateCommitMessage("fix governance missing colon");
      expect(errors.some((e) => e.includes("Conventional Commit type"))).toBe(
        true,
      );
    });

    it("rejects a subject exceeding 120 characters", () => {
      const prefix = "fix(scope): ";
      const summary = "x".repeat(121 - prefix.length);
      const errors = validateCommitMessage(`${prefix}${summary}`);
      expect(errors.some((e) => e.includes("exceeds 120 characters"))).toBe(
        true,
      );
    });

    it("rejects Generated with promotional attribution", () => {
      const errors = validateCommitMessage(
        "fix(governance): sample\n\nGenerated with ExampleTool",
      );
      expect(errors.some((e) => e.includes("generated-with attribution"))).toBe(
        true,
      );
    });

    it("rejects Generated by promotional attribution", () => {
      const errors = validateCommitMessage(
        "fix(governance): sample\n\nGenerated by ExampleTool",
      );
      expect(errors.some((e) => e.includes("generated-with attribution"))).toBe(
        true,
      );
    });

    it("rejects Made with promotional attribution", () => {
      const errors = validateCommitMessage(
        "fix(governance): sample\n\nMade with ExampleTool",
      );
      expect(errors.some((e) => e.includes("generated-with attribution"))).toBe(
        true,
      );
    });

    it("rejects an invalid subject when a co-author trailer is present", () => {
      const errors = validateCommitMessage(
        `wibble(governance): invalid type\n\n${SYNTHETIC_CO_AUTHOR}`,
      );
      expect(errors.some((e) => e.includes("Conventional Commit type"))).toBe(
        true,
      );
      expect(
        errors.some((e) =>
          e.includes("Co-Authored-By trailers are not allowed"),
        ),
      ).toBe(false);
    });

    it("rejects promotional attribution when a co-author trailer is present", () => {
      const message = [
        "fix(governance): sample",
        "",
        SYNTHETIC_CO_AUTHOR,
        "Made with ExampleTool",
      ].join("\n");
      const errors = validateCommitMessage(message);
      expect(errors.some((e) => e.includes("generated-with attribution"))).toBe(
        true,
      );
    });
  });
});

describe("validate-commit-message.mjs entry point", () => {
  it("exits zero for a message file with a truthful co-author trailer", () => {
    const message = [
      "fix(governance): allow truthful co-authorship metadata",
      "",
      SYNTHETIC_CO_AUTHOR,
    ].join("\n");
    const result = runValidateCommitMessageFile(message);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});

describe("validate-commit-range.mjs entry point", () => {
  it("validates commits in a temporary repository range", () => {
    const dir = mkdtempSync(join(tmpdir(), "intentloom-commit-range-"));
    try {
      execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
      execFileSync(
        "git",
        ["config", "user.email", "synthetic.author@example.test"],
        { cwd: dir },
      );
      execFileSync("git", ["config", "user.name", "Synthetic Author"], {
        cwd: dir,
      });
      writeFileSync(join(dir, "tracked.txt"), "baseline\n", "utf8");
      execFileSync("git", ["add", "tracked.txt"], { cwd: dir });
      execFileSync(
        "git",
        ["commit", "-m", "chore(init): seed temporary repository"],
        { cwd: dir, stdio: "ignore" },
      );
      const base = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      }).trim();
      writeFileSync(join(dir, "tracked.txt"), "baseline\nupdate\n", "utf8");
      execFileSync("git", ["add", "tracked.txt"], { cwd: dir });
      const coAuthorMessage = [
        "fix(governance): allow truthful co-authorship metadata",
        "",
        SYNTHETIC_CO_AUTHOR,
      ].join("\n");
      const messagePath = join(dir, "COMMIT_EDITMSG");
      writeFileSync(messagePath, coAuthorMessage, "utf8");
      execFileSync("git", ["commit", "-F", messagePath], {
        cwd: dir,
        stdio: "ignore",
      });
      const head = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      }).trim();
      const range = `${base}..${head}`;
      const stdout = execFileSync(
        process.execPath,
        [validateRangeScript, "--range", range],
        { cwd: dir, encoding: "utf8" },
      );
      expect(stdout).toMatch(/Commit policy passed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
