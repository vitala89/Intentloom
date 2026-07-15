import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@intentloom/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@intentloom/adapters": fileURLToPath(
        new URL("./packages/adapters/src/index.ts", import.meta.url),
      ),
      "@intentloom/validator": fileURLToPath(
        new URL("./packages/validator/src/index.ts", import.meta.url),
      ),
      "@intentloom/cli": fileURLToPath(
        new URL("./packages/cli/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Process suites build and pack the same CLI artifact; serialize files so
    // version synchronization cannot race another build's package writes.
    fileParallelism: false,
  },
});
