import { mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

await rm("packages/mcp-server/dist/intentloom-mcp.cjs", { force: true });
await mkdir("packages/mcp-server/dist", { recursive: true });
await build({
  entryPoints: ["packages/mcp-server/src/bin.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  outfile: "packages/mcp-server/dist/intentloom-mcp.cjs",
});
