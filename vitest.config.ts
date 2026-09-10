import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@intentloom/core/adoption": fileURLToPath(
        new URL("./packages/core/src/adoption.ts", import.meta.url),
      ),
      "@intentloom/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@intentloom/adapters": fileURLToPath(
        new URL("./packages/adapters/src/index.ts", import.meta.url),
      ),
      "@intentloom/validator/neutron-session": fileURLToPath(
        new URL(
          "./packages/validator/src/neutron-session-rpc.ts",
          import.meta.url,
        ),
      ),
      "@intentloom/validator/neutron-runtime-n2": fileURLToPath(
        new URL(
          "./packages/validator/src/neutron-runtime-n2.ts",
          import.meta.url,
        ),
      ),
      "@intentloom/validator": fileURLToPath(
        new URL("./packages/validator/src/index.ts", import.meta.url),
      ),
      "@intentloom/protocol": fileURLToPath(
        new URL("./packages/protocol/src/index.ts", import.meta.url),
      ),
      "@intentloom/application/neutron-session": fileURLToPath(
        new URL(
          "./packages/application/src/neutron-session-runtime.ts",
          import.meta.url,
        ),
      ),
      "@intentloom/application/model-adapter": fileURLToPath(
        new URL("./packages/application/src/model-adapter.ts", import.meta.url),
      ),
      "@intentloom/application/ollama-model-adapter": fileURLToPath(
        new URL(
          "./packages/application/src/ollama-model-adapter.ts",
          import.meta.url,
        ),
      ),
      "@intentloom/application": fileURLToPath(
        new URL("./packages/application/src/index.ts", import.meta.url),
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
    testTimeout: 15000,
  },
});
