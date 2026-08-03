import { isAbsolute, relative, resolve } from "node:path";
import { nodeFileSystem } from "@intentloom/application";

export type McpToolErrorCode =
  "arguments-invalid" | "root-symlink" | "tool-failed";

export class McpToolError extends Error {
  constructor(
    readonly code: McpToolErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface McpServerOptions {
  readonly root: string;
  readonly readFile?: (path: string) => Promise<string>;
}

export function boundedPath(root: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0)
    throw new McpToolError(
      "arguments-invalid",
      "file must be a non-empty string",
    );
  const candidate = resolve(root, value);
  const relativePath = relative(resolve(root), candidate);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    (isAbsolute(relativePath) && relativePath !== candidate)
  )
    throw new McpToolError(
      "arguments-invalid",
      "file must remain within the project root",
    );
  return candidate;
}

export async function assertNonSymlinkRoot(
  options: McpServerOptions,
): Promise<void> {
  if (await nodeFileSystem.isSymbolicLink(resolve(options.root)))
    throw new McpToolError(
      "root-symlink",
      "configured project root must not be a symbolic link",
    );
}

export function toolArguments(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new McpToolError("arguments-invalid", "arguments must be an object");
  return value as Record<string, unknown>;
}
