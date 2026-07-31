import { readFileSync } from "node:fs";
import { validateCommitMessage } from "./commit-policy.mjs";

const messagePath = process.argv[2];
if (!messagePath) {
  console.error(
    "Usage: node scripts/validate-commit-message.mjs <message-file>",
  );
  process.exit(2);
}

const errors = validateCommitMessage(
  readFileSync(messagePath, "utf8"),
  messagePath,
);
if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
