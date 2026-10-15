import type { HarnessCapabilities } from "@intentloom/protocol";
import type {
  HarnessStepExecutorOptions,
  HarnessStepExecutorResult,
} from "./harness-runner.js";

export interface HarnessIsolationAdapter {
  readonly name: "local-readonly" | "container" | "fake";
  readonly capabilities: HarnessCapabilities;
  executeStep(
    options: HarnessStepExecutorOptions,
  ): Promise<HarnessStepExecutorResult>;
  cleanup(): Promise<void>;
}

export interface LocalReadonlySandboxOptions {
  readonly projectRoot: string;
  readonly allowedActions?: readonly string[];
}

export interface ContainerMount {
  readonly hostPath: string;
  readonly containerPath: string;
  readonly readonly: boolean;
}

export interface ContainerSandboxOptions {
  readonly image: string;
  readonly containerName?: string;
  readonly mounts?: readonly ContainerMount[];
  readonly envAllowlist?: readonly string[];
  readonly memoryMb?: number;
  readonly timeoutMs?: number;
  readonly networkMode?: "none" | "bridge";
  readonly commandRunner?: (
    cmd: string,
    args: readonly string[],
  ) => Promise<HarnessStepExecutorResult>;
}

export function negotiateExecutorCapabilities(
  executorType: "local-readonly" | "container" | "fake",
  requested: HarnessCapabilities,
): HarnessCapabilities {
  if (executorType === "local-readonly") {
    return {
      readonlyFs: requested.readonlyFs,
      writeFs: false,
      processExecution: false,
      networkAccess: false,
      maxDurationMs: Math.min(requested.maxDurationMs, 60_000),
      maxMemoryMb: Math.min(requested.maxMemoryMb, 512),
    };
  }

  if (executorType === "container") {
    return {
      readonlyFs: requested.readonlyFs,
      writeFs: requested.writeFs,
      processExecution: requested.processExecution,
      networkAccess: false,
      maxDurationMs: Math.min(requested.maxDurationMs, 300_000),
      maxMemoryMb: Math.min(requested.maxMemoryMb, 2048),
    };
  }

  return requested;
}

export function createLocalReadonlySandbox(
  options: LocalReadonlySandboxOptions,
): HarnessIsolationAdapter {
  const allowedActions = new Set(
    options.allowedActions ?? [
      "read",
      "inspect",
      "analyze",
      "validate",
      "doctor",
      "diff",
    ],
  );

  const capabilities: HarnessCapabilities = {
    readonlyFs: true,
    writeFs: false,
    processExecution: false,
    networkAccess: false,
    maxDurationMs: 60_000,
    maxMemoryMb: 512,
  };

  return {
    name: "local-readonly",
    capabilities,
    async executeStep(stepOptions) {
      if (!allowedActions.has(stepOptions.action)) {
        return {
          success: false,
          message: `Action '${stepOptions.action}' is forbidden in local-readonly isolation adapter`,
        };
      }
      return {
        success: true,
        message: `Executed read-only action '${stepOptions.action}' in ${options.projectRoot}`,
        payload: {
          projectRoot: options.projectRoot,
          action: stepOptions.action,
        },
      };
    },
    async cleanup() {},
  };
}

export function createContainerSandbox(
  options: ContainerSandboxOptions,
): HarnessIsolationAdapter {
  const memoryMb = options.memoryMb ?? 1024;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const networkMode = options.networkMode ?? "none";

  const capabilities: HarnessCapabilities = {
    readonlyFs: true,
    writeFs: true,
    processExecution: true,
    networkAccess: networkMode === "bridge",
    maxDurationMs: timeoutMs,
    maxMemoryMb: memoryMb,
  };

  let cleanedUp = false;

  return {
    name: "container",
    capabilities,
    async executeStep(stepOptions) {
      if (cleanedUp) {
        return {
          success: false,
          message: "Container sandbox has already been cleaned up",
        };
      }

      if (options.commandRunner) {
        const envArgs = (options.envAllowlist ?? []).flatMap((key) => [
          "-e",
          key,
        ]);
        const mountArgs = (options.mounts ?? []).flatMap((m) => [
          "-v",
          `${m.hostPath}:${m.containerPath}${m.readonly ? ":ro" : ""}`,
        ]);
        const dockerArgs = [
          "run",
          "--rm",
          "--network",
          networkMode,
          "-m",
          `${memoryMb}m`,
          ...envArgs,
          ...mountArgs,
          options.image,
          stepOptions.action,
        ];
        return options.commandRunner("docker", dockerArgs);
      }

      return {
        success: true,
        message: `Container action '${stepOptions.action}' prepared for image '${options.image}'`,
        payload: {
          image: options.image,
          networkMode,
          memoryMb,
          mounts: options.mounts ?? [],
        },
      };
    },
    async cleanup() {
      cleanedUp = true;
    },
  };
}

export function createFakeSandbox(
  grantedCapabilities?: Partial<HarnessCapabilities>,
  stepResults?: Record<string, HarnessStepExecutorResult>,
): HarnessIsolationAdapter {
  const capabilities: HarnessCapabilities = {
    readonlyFs: true,
    writeFs: true,
    processExecution: true,
    networkAccess: false,
    maxDurationMs: 60_000,
    maxMemoryMb: 512,
    ...grantedCapabilities,
  };

  return {
    name: "fake",
    capabilities,
    async executeStep(stepOptions) {
      if (stepResults && stepOptions.stepId in stepResults) {
        const customResult = stepResults[stepOptions.stepId];
        if (customResult) return customResult;
      }
      return {
        success: true,
        message: `Fake step '${stepOptions.stepId}' executed`,
      };
    },
    async cleanup() {},
  };
}
