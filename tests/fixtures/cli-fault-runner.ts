import { resolve } from "node:path";
import { runCli } from "../../packages/cli/src/command.js";
import type { TransactionStage } from "../../packages/cli/src/index.js";

const failAt = process.env.AIF_TEST_FAIL_AT as TransactionStage | undefined;
const rollbackFailPaths = (process.env.AIF_TEST_ROLLBACK_PATHS ?? "")
  .split(",")
  .filter(Boolean);
const corruptAfterFinalization =
  process.env.AIF_TEST_CORRUPT === "manifest"
    ? async ({
        root,
        fileSystem,
      }: Parameters<
        NonNullable<
          import("../../packages/cli/src/index.js").TransactionOptions["corruptAfterFinalization"]
        >
      >[0]) => {
        await fileSystem.write(
          resolve(root, ".aif/manifest.lock.json"),
          "{ malformed",
        );
      }
    : undefined;
const catalogRoot = process.env.AIF_TEST_CATALOG_ROOT;
if (catalogRoot === undefined) throw new Error("missing test catalog root");

void runCli(
  process.argv.slice(2),
  {
    catalogRoot,
    transactionOptions: {
      ...(failAt === undefined ? {} : { failAt }),
      ...(rollbackFailPaths.length === 0 ? {} : { rollbackFailPaths }),
      ...(corruptAfterFinalization === undefined
        ? {}
        : { corruptAfterFinalization }),
    },
  },
  {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
).then((exitCode) => {
  process.exitCode = exitCode;
});
