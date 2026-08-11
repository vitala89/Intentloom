import type { FoundationAnswer } from "@intentloom/protocol";
import {
  createFoundationWorkshop,
  deleteFoundationWorkshop,
  evaluateFoundationWorkshopReadiness,
  exportFoundationWorkshopJson,
  getFoundationWorkshopViewmodel,
  identifyFoundationWorkshopConflicts,
  listFoundationQuestions,
  recordFoundationWorkshopAnswer,
  summarizeFoundationUnderstandingViewmodel,
} from "./foundation-workshop.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";

export type FoundationCliCommand =
  | "start"
  | "get"
  | "questions"
  | "answer"
  | "summarize"
  | "conflicts"
  | "readiness"
  | "export"
  | "delete";

function jsonResult(
  payload: unknown,
  json: boolean,
  human: string,
): QualityCliResult {
  return {
    exitCode: 0,
    stdout: json ? JSON.stringify(payload, null, 2) : human,
    stderr: "",
  };
}

function errorResult(message: string): QualityCliResult {
  return { exitCode: 1, stdout: "", stderr: message };
}

export function runFoundationCliCommand(
  command: FoundationCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly idea?: string;
    readonly workshopId?: string;
    readonly answer?: FoundationAnswer;
    readonly pendingOnly?: boolean;
    readonly inceptionSessionId?: string;
  },
): QualityCliResult {
  const json = args.json ?? false;

  try {
    if (command === "start") {
      if (!args.root || !args.idea) {
        return errorResult("Error: root and idea are required for start");
      }
      const workshop = createFoundationWorkshop({
        root: args.root,
        idea: args.idea,
        ...(args.inceptionSessionId !== undefined
          ? { inceptionSessionId: args.inceptionSessionId }
          : {}),
      });
      const viewmodel = getFoundationWorkshopViewmodel(workshop.id);
      return jsonResult(
        viewmodel,
        json,
        `Foundation workshop ${workshop.id} created for ${workshop.root}`,
      );
    }

    if (!args.workshopId) {
      return errorResult(`Error: workshopId is required for '${command}'`);
    }

    if (command === "get") {
      return jsonResult(
        getFoundationWorkshopViewmodel(args.workshopId),
        json,
        `Foundation workshop ${args.workshopId}`,
      );
    }

    if (command === "questions") {
      const list =
        args.pendingOnly === true
          ? listFoundationQuestions(args.workshopId, { pendingOnly: true })
          : listFoundationQuestions(args.workshopId);
      return jsonResult(
        list,
        json,
        `Questions for ${args.workshopId}: ${list.questions.length} listed, ${list.pendingQuestionIds.length} pending`,
      );
    }

    if (command === "answer") {
      if (!args.answer) {
        return errorResult("Error: answer payload is required for answer");
      }
      const workshop = recordFoundationWorkshopAnswer(
        args.workshopId,
        args.answer,
      );
      return jsonResult(
        getFoundationWorkshopViewmodel(workshop.id),
        json,
        `Recorded answer for ${args.workshopId}`,
      );
    }

    if (command === "summarize") {
      return jsonResult(
        summarizeFoundationUnderstandingViewmodel(args.workshopId),
        json,
        `Understanding summary for ${args.workshopId}`,
      );
    }

    if (command === "conflicts") {
      return jsonResult(
        identifyFoundationWorkshopConflicts(args.workshopId),
        json,
        `Conflicts for ${args.workshopId}`,
      );
    }

    if (command === "readiness") {
      return jsonResult(
        evaluateFoundationWorkshopReadiness(args.workshopId),
        json,
        `Readiness for ${args.workshopId}`,
      );
    }

    if (command === "export") {
      return jsonResult(
        exportFoundationWorkshopJson(args.workshopId),
        json,
        `Exported ${args.workshopId}`,
      );
    }

    if (command === "delete") {
      return jsonResult(
        deleteFoundationWorkshop(args.workshopId),
        json,
        `Deleted ${args.workshopId}`,
      );
    }

    return errorResult(`Unknown command: '${command}'`);
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
