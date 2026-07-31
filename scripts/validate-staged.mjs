import { execFileSync } from "node:child_process";
import { hasQualityException } from "./quality-exceptions.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const staged = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8", cwd: root },
)
  .split("\0")
  .filter(Boolean);

execFileSync("git", ["diff", "--cached", "--check"], {
  stdio: "inherit",
  cwd: root,
});

const formatTargets = staged.filter(
  (file) =>
    /\.(ts|tsx|css|md|json|ya?ml)$/.test(file) &&
    !file.endsWith("pnpm-lock.yaml") &&
    !file.endsWith("Cargo.lock"),
);
if (formatTargets.length > 0) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(
    pnpm,
    ["exec", "prettier", "--check", "--ignore-unknown", ...formatTargets],
    {
      stdio: "inherit",
      cwd: root,
    },
  );
}

const sourcePattern =
  /^(packages|apps)\/[^/]+\/src\/.*\.(ts|tsx|js|jsx|mjs|cjs|rs)$/;
const errors = [];
for (const file of staged.filter((candidate) =>
  sourcePattern.test(candidate),
)) {
  const stagedSource = execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    cwd: root,
  });
  const stagedLines =
    stagedSource.split("\n").length - (stagedSource.endsWith("\n") ? 1 : 0);
  let previousLines = null;
  try {
    const previous = execFileSync("git", ["show", `HEAD:${file}`], {
      encoding: "utf8",
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    });
    previousLines =
      previous.split("\n").length - (previous.endsWith("\n") ? 1 : 0);
  } catch {
    // New files have no previous version.
  }
  if (previousLines === null && stagedLines > 400) {
    errors.push(
      `${file}: new production file is ${stagedLines} lines; hard limit is 400`,
    );
  } else if (
    previousLines !== null &&
    previousLines > 400 &&
    stagedLines > previousLines &&
    !hasQualityException(file, previousLines, stagedLines)
  ) {
    errors.push(
      `${file}: existing oversized file grew from ${previousLines} to ${stagedLines} lines`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log(`Staged quality checks passed for ${staged.length} file(s).`);
