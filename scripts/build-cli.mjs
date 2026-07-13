import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { build } from "esbuild";

await rm("packages/cli/dist/catalog", { recursive: true, force: true });
await mkdir("packages/cli/dist", { recursive: true });
await build({
  entryPoints: ["packages/cli/src/bin.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node24",
  outfile: "packages/cli/dist/aif.cjs",
});
await cp("catalog", "packages/cli/dist/catalog", { recursive: true });
await cp("profiles", "packages/cli/dist/profiles", { recursive: true });
