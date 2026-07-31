import { execFileSync } from "node:child_process";
import { hasQualityException } from "./quality-exceptions.mjs";

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
const sourcePattern =
  /^(packages|apps)\/[^/]+\/src\/.*\.(ts|tsx|js|jsx|mjs|cjs|rs)$/;
const errors = [];
for (const file of changed.filter((candidate) =>
  sourcePattern.test(candidate),
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
  const headLines =
    headSource.split("\n").length - (headSource.endsWith("\n") ? 1 : 0);
  let baseLines = null;
  try {
    const baseSource = execFileSync("git", ["show", `${base}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    baseLines =
      baseSource.split("\n").length - (baseSource.endsWith("\n") ? 1 : 0);
  } catch {
    // New files are checked against the hard limit below.
  }
  if (baseLines === null && headLines > 400) {
    errors.push(
      `${file}: new production file is ${headLines} lines; hard limit is 400`,
    );
  } else if (
    baseLines !== null &&
    baseLines > 400 &&
    headLines > baseLines &&
    !hasQualityException(file, baseLines, headLines)
  ) {
    errors.push(
      `${file}: existing oversized file grew from ${baseLines} to ${headLines} lines`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log(
  `Diff quality checks passed for ${changed.length} changed file(s).`,
);
