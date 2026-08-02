import type {
  HarnessCapabilities,
  HarnessExecutionEvent,
  HarnessExecutionRequest,
  HarnessScenario,
  HarnessScorecard,
} from "@intentloom/protocol";
import {
  validateHarnessExecutionRequest,
  validateHarnessScenario,
} from "@intentloom/validator";

export interface HarnessStepExecutorOptions {
  readonly stepId: string;
  readonly action: string;
  readonly params?: Record<string, unknown>;
  readonly signal?: AbortSignal;
}

export interface HarnessStepExecutorResult {
  readonly success: boolean;
  readonly message?: string;
  readonly payload?: Record<string, unknown>;
}

export type HarnessStepExecutor = (
  options: HarnessStepExecutorOptions,
) => Promise<HarnessStepExecutorResult>;

export interface HarnessRunnerOptions {
  readonly scenario: HarnessScenario;
  readonly request: HarnessExecutionRequest;
  readonly stepExecutor?: HarnessStepExecutor;
  readonly now?: () => number;
  readonly generateId?: (prefix: string) => string;
  readonly signal?: AbortSignal;
}

function capabilitiesSatisfied(
  required: HarnessCapabilities,
  granted: HarnessCapabilities,
): boolean {
  if (required.writeFs && !granted.writeFs) return false;
  if (required.processExecution && !granted.processExecution) return false;
  if (required.networkAccess && !granted.networkAccess) return false;
  if (granted.maxDurationMs < required.maxDurationMs) return false;
  if (granted.maxMemoryMb < required.maxMemoryMb) return false;
  return true;
}

export async function executeHarnessScenario(
  options: HarnessRunnerOptions,
): Promise<HarnessScorecard> {
  const scenario = validateHarnessScenario(options.scenario);
  const request = validateHarnessExecutionRequest(options.request);

  const nowFn = options.now ?? (() => Date.now());
  const idFn =
    options.generateId ??
    ((prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`);
  const startTime = nowFn();
  const scorecardId = idFn("scorecard");

  const events: HarnessExecutionEvent[] = [
    {
      eventId: idFn("event"),
      timestamp: startTime,
      type: "info",
      message: `Started scenario evaluation: ${scenario.scenarioId}`,
    },
  ];
  const diagnostics: string[] = [];

  if (
    !capabilitiesSatisfied(
      scenario.requiredCapabilities,
      request.requestedCapabilities,
    )
  ) {
    events.push({
      eventId: idFn("event"),
      timestamp: nowFn(),
      type: "error",
      message:
        "Capabilities check failed: requested capabilities do not satisfy scenario requirements",
    });
    diagnostics.push("capability-mismatch");
    return {
      schemaVersion: 1,
      scorecardId,
      scenarioId: scenario.scenarioId,
      requestId: request.requestId,
      status: "budget-exceeded",
      overallScore: 0,
      passedAssertions: 0,
      totalAssertions: scenario.steps.length,
      durationMs: nowFn() - startTime,
      diagnostics,
      events,
      artifacts: [],
    };
  }

  let passedSteps = 0;
  let status: HarnessScorecard["status"] = "passed";

  for (const step of scenario.steps) {
    if (options.signal?.aborted) {
      status = "cancelled";
      diagnostics.push("evaluation-cancelled");
      events.push({
        eventId: idFn("event"),
        timestamp: nowFn(),
        type: "info",
        message: "Scenario evaluation cancelled by signal",
      });
      break;
    }

    const elapsed = nowFn() - startTime;
    if (elapsed > request.requestedCapabilities.maxDurationMs) {
      status = "timed-out";
      diagnostics.push("max-duration-exceeded");
      events.push({
        eventId: idFn("event"),
        timestamp: nowFn(),
        type: "error",
        message: `Evaluation timed out after ${elapsed}ms`,
      });
      break;
    }

    events.push({
      eventId: idFn("event"),
      timestamp: nowFn(),
      stepId: step.id,
      type: "step-start",
      message: `Step start: ${step.name}`,
    });

    try {
      if (options.stepExecutor) {
        const res = await options.stepExecutor({
          stepId: step.id,
          action: step.action,
          ...(step.params ? { params: step.params } : {}),
          ...(options.signal ? { signal: options.signal } : {}),
        });

        if (res.success) {
          passedSteps += 1;
          events.push({
            eventId: idFn("event"),
            timestamp: nowFn(),
            stepId: step.id,
            type: "step-complete",
            message: res.message ?? `Step passed: ${step.name}`,
            ...(res.payload ? { payload: res.payload } : {}),
          });
        } else {
          status = "failed";
          events.push({
            eventId: idFn("event"),
            timestamp: nowFn(),
            stepId: step.id,
            type: "step-fail",
            message: res.message ?? `Step failed: ${step.name}`,
            ...(res.payload ? { payload: res.payload } : {}),
          });
        }
      } else {
        passedSteps += 1;
        events.push({
          eventId: idFn("event"),
          timestamp: nowFn(),
          stepId: step.id,
          type: "step-complete",
          message: `Step passed (default): ${step.name}`,
        });
      }
    } catch (error) {
      status = "error";
      diagnostics.push("step-execution-error");
      events.push({
        eventId: idFn("event"),
        timestamp: nowFn(),
        stepId: step.id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  const totalSteps = scenario.steps.length;
  const overallScore =
    totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 0;

  return {
    schemaVersion: 1,
    scorecardId,
    scenarioId: scenario.scenarioId,
    requestId: request.requestId,
    status,
    overallScore,
    passedAssertions: passedSteps,
    totalAssertions: totalSteps,
    durationMs: nowFn() - startTime,
    diagnostics,
    events,
    artifacts: [],
  };
}
