import { readFile } from "node:fs/promises";
import type { ExternalQualityPackActivationApproval } from "@intentloom/protocol";
import {
  validateExternalQualityPackActivationApproval,
  validateExternalQualityPackImportRequest,
} from "@intentloom/validator";
import type { FileSystem } from "../index.js";
import { nodeFileSystem } from "../index.js";
import type { QualityCliResult } from "./cli-quality-standards.js";
import {
  activateExternalSpecializedPack,
  previewExternalSpecializedPack,
} from "./specialized-pack-external-lifecycle.js";
import { applyExternalSpecializedPackActivation } from "./specialized-pack-external-apply.js";
import {
  buildExternalSpecializedPackApplyViewModel,
  buildExternalSpecializedPackPreviewViewModel,
  externalSpecializedPackApplyExitCode,
  externalSpecializedPackPreviewExitCode,
  renderExternalSpecializedPackApplyText,
  renderExternalSpecializedPackPreviewText,
} from "./specialized-pack-external-viewmodel.js";

export type SpecializedPacksExternalCliCommand = "preview" | "activate";

export interface SpecializedPacksExternalCliInput {
  readonly payload: string;
  readonly source: unknown;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
}

async function readJsonFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}

async function resolvePayload(
  args: {
    readonly manifestFile?: string;
    readonly manifestJson?: string;
  },
  label: string,
): Promise<string> {
  if (args.manifestFile && args.manifestJson) {
    throw new Error(
      `only one of --manifest-file or --manifest-json is allowed for ${label}`,
    );
  }
  if (args.manifestFile) return readJsonFile(args.manifestFile);
  if (args.manifestJson) return args.manifestJson;
  throw new Error(
    `--manifest-file or --manifest-json is required for ${label}`,
  );
}

async function resolveApproval(args: {
  readonly approvalFile?: string;
  readonly approvalJson?: string;
}): Promise<ExternalQualityPackActivationApproval> {
  if (args.approvalFile && args.approvalJson) {
    throw new Error(
      "only one of --approval-file or --approval-json is allowed",
    );
  }
  let raw: string;
  if (args.approvalFile) raw = await readJsonFile(args.approvalFile);
  else if (args.approvalJson) raw = args.approvalJson;
  else
    throw new Error(
      "--approval-file or --approval-json is required for activate",
    );
  return validateExternalQualityPackActivationApproval(JSON.parse(raw));
}

function parseImportInput(input: SpecializedPacksExternalCliInput) {
  return validateExternalQualityPackImportRequest({
    schemaVersion: "urn:intentloom:schema:engineering-quality-pack-import:1",
    payload: input.payload,
    source: input.source,
    declaredPublisher: input.declaredPublisher,
    declaredLicense: input.declaredLicense,
  });
}

function previewInput(input: SpecializedPacksExternalCliInput) {
  const parsed = parseImportInput(input);
  return {
    payload: parsed.payload,
    source: parsed.source,
    declaredPublisher: parsed.declaredPublisher,
    declaredLicense: parsed.declaredLicense,
  };
}

function successResult(
  payload: unknown,
  json: boolean,
  human: string,
  exitCode: number,
): QualityCliResult {
  return {
    exitCode,
    stdout: json ? JSON.stringify(payload, null, 2) : human,
    stderr: "",
  };
}

function errorResult(message: string, exitCode = 1): QualityCliResult {
  return { exitCode, stdout: "", stderr: message };
}

export async function runSpecializedPacksExternalCliCommand(
  command: SpecializedPacksExternalCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly manifestFile?: string;
    readonly manifestJson?: string;
    readonly sourceJson?: string;
    readonly approvalFile?: string;
    readonly approvalJson?: string;
    readonly declaredPublisher?: string;
    readonly declaredLicense?: string;
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  try {
    const payload = await resolvePayload(args, command);
    if (!args.sourceJson) {
      return errorResult("Error: --source-json is required");
    }
    if (!args.declaredPublisher || !args.declaredLicense) {
      return errorResult(
        "Error: --declared-publisher and --declared-license are required",
      );
    }
    const source = JSON.parse(args.sourceJson) as unknown;
    const input: SpecializedPacksExternalCliInput = {
      payload,
      source,
      declaredPublisher: args.declaredPublisher,
      declaredLicense: args.declaredLicense,
    };

    if (command === "preview") {
      const preview = previewExternalSpecializedPack(previewInput(input));
      const viewmodel = buildExternalSpecializedPackPreviewViewModel(preview);
      return successResult(
        viewmodel,
        json,
        renderExternalSpecializedPackPreviewText(viewmodel),
        externalSpecializedPackPreviewExitCode(viewmodel),
      );
    }

    if (!args.root) {
      return errorResult("Error: --root is required for activate");
    }
    const approval = await resolveApproval(args);
    try {
      const preview = previewExternalSpecializedPack(previewInput(input));
      const activation = activateExternalSpecializedPack(preview, approval);
      const result = await applyExternalSpecializedPackActivation(
        {
          root: args.root,
          activation,
          approval,
          declaredLicense: input.declaredLicense,
        },
        args.fs ?? nodeFileSystem,
      );
      const viewmodel = buildExternalSpecializedPackApplyViewModel(result);
      return successResult(
        viewmodel,
        json,
        renderExternalSpecializedPackApplyText(viewmodel),
        externalSpecializedPackApplyExitCode(viewmodel),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const viewmodel = buildExternalSpecializedPackApplyViewModel({
        status: "denied",
        projectRoot: args.root,
        extensionId: "unknown",
        digest:
          typeof source === "object" &&
          source !== null &&
          "digest" in source &&
          typeof (source as { digest: unknown }).digest === "string"
            ? (source as { digest: string }).digest
            : "",
        pin:
          typeof source === "object" &&
          source !== null &&
          "pin" in source &&
          typeof (source as { pin: unknown }).pin === "string"
            ? (source as { pin: string }).pin
            : "",
        changedPaths: [],
        writes: 0,
        diagnostics: [message],
        rollbackAttempted: false,
        rollbackCompleted: true,
        rollbackFailures: [],
      });
      return successResult(
        viewmodel,
        json,
        renderExternalSpecializedPackApplyText(viewmodel),
        externalSpecializedPackApplyExitCode(viewmodel),
      );
    }
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
