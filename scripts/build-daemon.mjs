import { mkdir, readFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("packages/daemon/dist", { recursive: true });
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await build({
  entryPoints: ["packages/daemon/src/bin.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  define: {
    "process.env.INTENTLOOM_DAEMON_VERSION": JSON.stringify(version),
  },
  outfile: "packages/daemon/dist/intentloomd.cjs",
});
