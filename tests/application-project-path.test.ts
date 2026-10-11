import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  inside,
  projectRelativePaths,
  secretLikePath,
} from "../packages/application/src/project-path.js";

const root = resolve("/intentloom-project-path-root");

describe("application project path checks", () => {
  it("keeps the current secret-like classification", () => {
    expect(secretLikePath(".env")).toBe(true);
    expect(secretLikePath("config/.env")).toBe(true);
    expect(secretLikePath(".env.production")).toBe(true);
    expect(secretLikePath("config/.env.local")).toBe(true);
    expect(secretLikePath("keys/release.pem")).toBe(true);
    expect(secretLikePath("keys/id_rsa.key")).toBe(true);
    expect(secretLikePath("certs/client.p12")).toBe(true);
    expect(secretLikePath("certs/client.pfx")).toBe(true);
    expect(secretLikePath("keys/release.PEM")).toBe(true);
    expect(secretLikePath(".ENV")).toBe(false);
    expect(secretLikePath(".Env.production")).toBe(false);
    expect(secretLikePath("src/index.ts")).toBe(false);
    expect(secretLikePath("README.md")).toBe(false);
    expect(secretLikePath("notes.env")).toBe(false);
    expect(secretLikePath("secrets\\.env")).toBe(false);
  });

  it("accepts the project root and paths lexically inside it", () => {
    expect(inside(root, ".")).toBe(resolve(root));
    expect(inside(root, "src/a.ts")).toBe(resolve(root, "src/a.ts"));
  });

  it("rejects sibling-prefix and parent escapes with the current error text", () => {
    expect(() =>
      inside(root, "../intentloom-project-path-root-evil"),
    ).toThrowError(
      new Error("path traversal: ../intentloom-project-path-root-evil"),
    );
    expect(() => inside(root, "../outside")).toThrowError(
      new Error("path traversal: ../outside"),
    );
  });

  it("keeps project-relative conversion, order, and exclusions", () => {
    expect(
      projectRelativePaths(root, [
        "b.ts",
        "a/c.ts",
        "a/c.ts",
        "node_modules/pkg/index.js",
        "../outside.ts",
        "src\\d.ts",
        "",
        ".",
      ]),
    ).toEqual(["a/c.ts", "b.ts", "src/d.ts"]);
  });

  it("keeps the module internal and off the public application API", () => {
    const source = readFileSync(
      "packages/application/src/project-path.ts",
      "utf8",
    );
    const barrel = readFileSync("packages/application/src/index.ts", "utf8");
    const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(imports).toEqual(["node:path", "./project-scan-exclusions.js"]);
    expect(source).toContain('segment === ".env"');
    expect(source).toContain('segment.startsWith(".env.")');
    expect(source).toContain("/\\.(?:key|pem|p12|pfx)$/iu");
    expect(source).toContain('.split("/")');
    expect(source).toContain("`path traversal: ${path}`");
    expect(source).not.toContain("realpath");
    expect(source).not.toMatch(/from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/);
    expect(barrel).toContain('from "./project-path.js"');
    expect(barrel).not.toMatch(/^function secretLikePath/m);
    expect(barrel).not.toMatch(/^function projectRelativePaths/m);
    expect(barrel).not.toMatch(/^function inside\b/m);
    expect(barrel).not.toMatch(
      /export\s*\{[^}]*\b(?:secretLikePath|projectRelativePaths|inside)\b/,
    );
    expect("secretLikePath" in application).toBe(false);
    expect("projectRelativePaths" in application).toBe(false);
    expect("inside" in application).toBe(false);
  });
});
