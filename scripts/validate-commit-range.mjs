import { execFileSync } from "node:child_process";
import { validateCommitMessage } from "./commit-policy.mjs";

const rangeIndex = process.argv.indexOf("--range");
const range = rangeIndex >= 0 ? process.argv[rangeIndex + 1] : undefined;
if (!range) {
  console.error(
    "Usage: node scripts/validate-commit-range.mjs --range <base>..<head>",
  );
  process.exit(2);
}

const commits = execFileSync("git", ["rev-list", "--reverse", range], {
  encoding: "utf8",
}).trim();
const errors = [];
for (const sha of commits ? commits.split("\n") : []) {
  const message = execFileSync("git", ["show", "-s", "--format=%B", sha], {
    encoding: "utf8",
  });
  errors.push(...validateCommitMessage(message, sha.slice(0, 12)));
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log(
  `Commit policy passed for ${commits ? commits.split("\n").length : 0} commit(s).`,
);
