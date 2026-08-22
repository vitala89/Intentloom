import { execFileSync } from "node:child_process";
import { hasQualityException } from "./quality-exceptions.mjs";
import {
  PRODUCTION_SOURCE_PATTERN,
  evaluateProductionSourceChange,
} from "./production-file-metrics.mjs";

const valueFor = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const base = valueFor("--base");
const head = valueFor("--head");
if (!base || !head) {
  console.error(
    "Usage: node scripts/validate-diff.mjs --base <sha> --head <sha>",
  );
  process.exit(2);
}

const range = `${base}...${head}`;
execFileSync("git", ["diff", "--check", range], { stdio: "inherit" });
const changed = execFileSync("git", ["diff", "--name-only", "-z", range], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const errors = [];
for (const file of changed.filter((candidate) =>
  PRODUCTION_SOURCE_PATTERN.test(candidate),
)) {
  let headSource;
  try {
    headSource = execFileSync("git", ["show", `${head}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    continue;
  }
  let baseSource = null;
  try {
    baseSource = execFileSync("git", ["show", `${base}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // New files are checked against the hard limit below.
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
console.log(
  `Diff quality checks passed for ${changed.length} changed file(s).`,
);
