import { execFileSync } from "node:child_process";
import { hasQualityException } from "./quality-exceptions.mjs";
import {
  PRODUCTION_SOURCE_PATTERN,
  evaluateProductionSourceChange,
} from "./production-file-metrics.mjs";

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

const errors = [];
for (const file of staged.filter((candidate) =>
  PRODUCTION_SOURCE_PATTERN.test(candidate),
)) {
  const headSource = execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    cwd: root,
  });
  let baseSource = null;
  try {
    baseSource = execFileSync("git", ["show", `HEAD:${file}`], {
      encoding: "utf8",
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // New files have no previous version.
  }
  errors.push(
    ...evaluateProductionSourceChange({
      filePath: file,
      baseSource,
      headSource,
      hasException: (metrics) =>
        hasQualityException({
          path: metrics.path,
          baseMetrics: metrics.baseMetrics,
          headMetrics: metrics.headMetrics,
        }),
    }),
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log(`Staged quality checks passed for ${staged.length} file(s).`);
