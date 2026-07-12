import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@aif/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@aif/adapters": fileURLToPath(
        new URL("./packages/adapters/src/index.ts", import.meta.url),
      ),
      "@aif/validator": fileURLToPath(
        new URL("./packages/validator/src/index.ts", import.meta.url),
      ),
      "@aif/cli": fileURLToPath(
        new URL("./packages/cli/src/index.ts", import.meta.url),
      ),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
