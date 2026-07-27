import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@intentloom/protocol": resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../../packages/protocol/src/index.ts",
      ),
    },
  },
  clearScreen: false,
  server: {
    strictPort: true,
  },
});
