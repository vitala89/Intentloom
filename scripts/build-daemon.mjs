import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("packages/daemon/dist", { recursive: true });
await build({
  entryPoints: ["packages/daemon/src/bin.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  outfile: "packages/daemon/dist/intentloomd.cjs",
});
