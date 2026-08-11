import type { InceptionAnswer } from "@intentloom/protocol";
import {
  createInceptionSession,
  deleteInceptionSession,
  exportInceptionSessionJson,
  getInceptionSessionViewmodel,
  identifyInceptionSessionConflicts,
  listInceptionQuestions,
  recordInceptionSessionAnswer,
  summarizeInceptionSessionViewmodel,
} from "./inception.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";

export type InceptionCliCommand =
  | "start"
  | "get"
  | "questions"
  | "answer"
  | "summarize"
  | "conflicts"
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

export function runInceptionCliCommand(
  command: InceptionCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly idea?: string;
    readonly sessionId?: string;
    readonly answer?: InceptionAnswer;
    readonly pendingOnly?: boolean;
  },
): QualityCliResult {
  const json = args.json ?? false;

  try {
    if (command === "start") {
      if (!args.root || !args.idea) {
        return errorResult("Error: root and idea are required for start");
      }
      const session = createInceptionSession({
        root: args.root,
        idea: args.idea,
      });
      const viewmodel = getInceptionSessionViewmodel(session.id);
      return jsonResult(
        viewmodel,
        json,
        `Inception session ${session.id} created for ${session.root}`,
      );
    }

    if (!args.sessionId) {
      return errorResult(`Error: sessionId is required for '${command}'`);
    }

    if (command === "get") {
      return jsonResult(
        getInceptionSessionViewmodel(args.sessionId),
        json,
        `Inception session ${args.sessionId}`,
      );
    }

    if (command === "questions") {
      const list =
        args.pendingOnly === true
          ? listInceptionQuestions(args.sessionId, { pendingOnly: true })
          : listInceptionQuestions(args.sessionId);
      return jsonResult(
        list,
        json,
        `Questions for ${args.sessionId}: ${list.questions.length} listed, ${list.pendingQuestionIds.length} pending`,
      );
    }

    if (command === "answer") {
      if (!args.answer) {
        return errorResult("Error: answer payload is required for answer");
      }
      const session = recordInceptionSessionAnswer(args.sessionId, args.answer);
      return jsonResult(
        getInceptionSessionViewmodel(session.id),
        json,
        `Recorded answer for ${args.sessionId}`,
      );
    }

    if (command === "summarize") {
      return jsonResult(
        summarizeInceptionSessionViewmodel(args.sessionId),
        json,
        `Summary for ${args.sessionId}`,
      );
    }

    if (command === "conflicts") {
      return jsonResult(
        identifyInceptionSessionConflicts(args.sessionId),
        json,
        `Conflicts for ${args.sessionId}`,
      );
    }

    if (command === "export") {
      return jsonResult(
        exportInceptionSessionJson(args.sessionId),
        json,
        `Exported ${args.sessionId}`,
      );
    }

    if (command === "delete") {
      return jsonResult(
        deleteInceptionSession(args.sessionId),
        json,
        `Deleted ${args.sessionId}`,
      );
    }

    return errorResult(`Unknown command: '${command}'`);
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
