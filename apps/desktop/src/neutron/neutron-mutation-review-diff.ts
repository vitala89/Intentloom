import type { NeutronMutationReviewFileView } from "@intentloom/protocol";
import type { DiffHunk } from "../design/components/code/DiffViewer.js";
import type { DiffLineProps } from "../design/components/code/DiffLine.js";

/** Presentation cap. Larger host payloads stay unrendered and are labeled truncated. */
export const MUTATION_REVIEW_PRESENTATION_LINE_CAP = 2000;

export type ExactReviewDiffReason =
  "exact" | "secret" | "unavailable" | "binary" | "truncated";

export interface ExactReviewDiff {
  readonly hunks: readonly DiffHunk[];
  readonly reason: ExactReviewDiffReason;
}

interface LineEdit {
  readonly kind: "add" | "del" | "context";
  readonly text: string;
}

export function reviewTextLines(text: string): readonly string[] {
  if (text.length === 0) return [];
  const lines = text.split("\n");
  if (text.endsWith("\n")) lines.pop();
  return lines;
}

export function exactReviewFileDiff(
  file: NeutronMutationReviewFileView,
): ExactReviewDiff {
  if (file.status !== "available") return { hunks: [], reason: "secret" };
  if (file.proposedContent === undefined) {
    return { hunks: [], reason: "unavailable" };
  }
  const proposed = file.proposedContent;
  const current = file.currentContent;
  if (
    containsNul(proposed) ||
    (current !== undefined && containsNul(current))
  ) {
    return { hunks: [], reason: "binary" };
  }
  const currentLines = reviewTextLines(current ?? "");
  const proposedLines = reviewTextLines(proposed);
  if (
    currentLines.length + proposedLines.length >
    MUTATION_REVIEW_PRESENTATION_LINE_CAP
  ) {
    return { hunks: [], reason: "truncated" };
  }
  return {
    hunks: [toHunk(diffReviewLines(currentLines, proposedLines))],
    reason: "exact",
  };
}

function containsNul(text: string): boolean {
  return text.includes("\u0000");
}

function toHunk(edits: readonly LineEdit[]): DiffHunk {
  let oldNumber = 1;
  let newNumber = 1;
  const lines: DiffLineProps[] = edits.map((edit) => {
    if (edit.kind === "add") {
      const line = {
        kind: "add" as const,
        oldNumber: null,
        newNumber,
        content: edit.text,
      };
      newNumber += 1;
      return line;
    }
    if (edit.kind === "del") {
      const line = {
        kind: "del" as const,
        oldNumber,
        newNumber: null,
        content: edit.text,
      };
      oldNumber += 1;
      return line;
    }
    const line = {
      kind: "context" as const,
      oldNumber,
      newNumber,
      content: edit.text,
    };
    oldNumber += 1;
    newNumber += 1;
    return line;
  });
  return {
    range: `@@ -1,${oldNumber - 1} +1,${newNumber - 1} @@`,
    summary: "Current versus proposed",
    lines,
  };
}

export function diffReviewLines(
  current: readonly string[],
  proposed: readonly string[],
): readonly LineEdit[] {
  const traces: number[][] = [];
  const max = current.length + proposed.length;
  const offset = max;
  const v = Array.from({ length: 2 * max + 1 }, () => 0);
  for (let depth = 0; depth <= max; depth += 1) {
    if (advanceDepth(v, current, proposed, depth, offset)) {
      traces.push(v.slice());
      return backtrack(traces, current, proposed, offset);
    }
    traces.push(v.slice());
  }
  return backtrack(traces, current, proposed, offset);
}

function advanceDepth(
  v: number[],
  current: readonly string[],
  proposed: readonly string[],
  depth: number,
  offset: number,
): boolean {
  for (let k = -depth; k <= depth; k += 2) {
    const index = k + offset;
    const x = nextX(v, k, depth, index);
    const end = snake(current, proposed, x, x - k);
    v[index] = end.x;
    if (end.x >= current.length && end.y >= proposed.length) return true;
  }
  return false;
}

function nextX(v: number[], k: number, depth: number, index: number): number {
  if (k === -depth || (k !== depth && v[index - 1]! < v[index + 1]!)) {
    return v[index + 1]!;
  }
  return v[index - 1]! + 1;
}

function snake(
  current: readonly string[],
  proposed: readonly string[],
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  let nextXPos = x;
  let nextYPos = y;
  while (
    nextXPos < current.length &&
    nextYPos < proposed.length &&
    current[nextXPos] === proposed[nextYPos]
  ) {
    nextXPos += 1;
    nextYPos += 1;
  }
  return { x: nextXPos, y: nextYPos };
}

function backtrack(
  traces: readonly number[][],
  current: readonly string[],
  proposed: readonly string[],
  offset: number,
): readonly LineEdit[] {
  const edits: LineEdit[] = [];
  let x = current.length;
  let y = proposed.length;
  for (let depth = traces.length - 1; depth > 0; depth -= 1) {
    const step = walkDepth(traces, depth, x, y, offset);
    pushSnake(edits, current, x, y, step.prevX, step.prevY);
    pushEdit(edits, current, proposed, x, step.prevX, y);
    x = step.prevX;
    y = x - step.prevK;
  }
  pushSnake(edits, current, x, y, 0, 0);
  edits.reverse();
  return edits;
}

function walkDepth(
  traces: readonly number[][],
  depth: number,
  x: number,
  y: number,
  offset: number,
): { readonly prevK: number; readonly prevX: number; readonly prevY: number } {
  const k = x - y;
  const index = k + offset;
  const prev = traces[depth - 1]!;
  const prevK =
    k === -depth || (k !== depth && prev[index - 1]! < prev[index + 1]!)
      ? k + 1
      : k - 1;
  const prevX = prev[prevK + offset]!;
  return { prevK, prevX, prevY: prevX - prevK };
}

function pushSnake(
  edits: LineEdit[],
  current: readonly string[],
  x: number,
  y: number,
  prevX: number,
  prevY: number,
): void {
  let nextXPos = x;
  let nextYPos = y;
  while (nextXPos > prevX && nextYPos > prevY) {
    nextXPos -= 1;
    nextYPos -= 1;
    edits.push({ kind: "context", text: current[nextXPos]! });
  }
}

function pushEdit(
  edits: LineEdit[],
  current: readonly string[],
  proposed: readonly string[],
  x: number,
  prevX: number,
  y: number,
): void {
  if (x === prevX) {
    edits.push({ kind: "add", text: proposed[y - 1]! });
    return;
  }
  edits.push({ kind: "del", text: current[x - 1]! });
}
