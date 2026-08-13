import type { HarnessScorecard } from "@intentloom/protocol";
import { createFakeHarnessAgentAdapter } from "./harness-agent-fake.js";
import { executeHarnessAgent } from "./harness-agent.js";
import { executeHarnessScenario } from "./harness-runner.js";
import { createLocalReadonlySandbox } from "./harness-sandbox.js";

export async function executeBoundedCodingAgentTask(input: {
  readonly intentId: string;
  readonly root: string;
  readonly title: string;
  readonly now: () => number;
}): Promise<{
  readonly scorecard: HarnessScorecard;
  readonly agentStatus: string;
}> {
  const adapter = createFakeHarnessAgentAdapter();
  const agentResult = await executeHarnessAgent({
    adapter,
    request: {
      schemaVersion: 1,
      requestId: `bounded-agent-${input.intentId}`,
      input: `Implement "${input.title}" inside the approved root only.`,
      responseFormat: "text",
      requirements: {
        requiredFeatures: ["structured-output", "cancellation"],
        estimatedInputTokens: 32,
        maxOutputTokens: 256,
      },
    },
  });
  const sandbox = createLocalReadonlySandbox({ projectRoot: input.root });
  const scorecard = await executeHarnessScenario({
    now: input.now,
    generateId: (prefix) => `${prefix}-${input.intentId}`,
    stepExecutor: (step) => sandbox.executeStep(step),
    scenario: {
      schemaVersion: 1,
      scenarioId: `bounded-execution-${input.intentId}`,
      title: "Bounded coding-agent task",
      description:
        "Execute one bounded task without widening root, paths, commands, or network.",
      requiredCapabilities: {
        readonlyFs: true,
        writeFs: false,
        processExecution: false,
        networkAccess: false,
        maxDurationMs: 60_000,
        maxMemoryMb: 512,
      },
      steps: [
        {
          id: "checkpoint-plan",
          name: "Confirm approved plan",
          action: "inspect",
        },
        { id: "checkpoint-task", name: "Run bounded task", action: "analyze" },
        {
          id: "checkpoint-verify",
          name: "Run verification checks",
          action: "validate",
        },
        { id: "checkpoint-diff", name: "Prepare diff review", action: "diff" },
      ],
    },
    request: {
      schemaVersion: 1,
      requestId: `bounded-request-${input.intentId}`,
      scenarioId: `bounded-execution-${input.intentId}`,
      projectRoot: input.root,
      executorType: "local-readonly",
      requestedCapabilities: {
        readonlyFs: true,
        writeFs: false,
        processExecution: false,
        networkAccess: false,
        maxDurationMs: 60_000,
        maxMemoryMb: 512,
      },
      createdTimestamp: input.now(),
    },
  });
  await sandbox.cleanup();
  return { scorecard, agentStatus: agentResult.status };
}
