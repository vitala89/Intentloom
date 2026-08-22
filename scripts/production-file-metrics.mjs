import { createScanner } from "typescript/unstable/ast/scanner";

const END_OF_FILE = 1;
const SINGLE_LINE_COMMENT = 2;
const MULTI_LINE_COMMENT = 3;
const NEW_LINE_TRIVIA = 4;
const WHITESPACE_TRIVIA = 5;
const CONFLICT_MARKER_TRIVIA = 6;
const NON_TEXT_FILE_MARKER_TRIVIA = 7;
const JSX_TEXT_ALL_WHITESPACES = 12;

const LANGUAGE_VARIANT_STANDARD = 0;
const LANGUAGE_VARIANT_JSX = 1;

export const PRODUCTION_SOURCE_PATTERN =
  /^(packages|apps)\/[^/]+\/src\/.*\.(ts|tsx|js|jsx|mjs|cjs|rs)$/;

export const PREFERRED_EFFECTIVE_CODE_LINES = 250;
export const REVIEW_EFFECTIVE_CODE_LINES = 300;
export const HARD_EFFECTIVE_CODE_LINES = 400;
export const PHYSICAL_SAFETY_LINES = 700;

const JS_TS_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

export function extensionForPath(filePath) {
  const match = filePath.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

export function isGovernedProductionSource(filePath) {
  return PRODUCTION_SOURCE_PATTERN.test(filePath);
}

function splitSourceLines(source) {
  if (source.length === 0) {
    return [];
  }
  const lines = source.split("\n");
  if (source.endsWith("\n")) {
    lines.pop();
  }
  return lines;
}

function lineNumberAt(source, offset) {
  let line = 0;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) {
      line += 1;
    }
  }
  return line;
}

function markLineRange(lineKinds, startLine, endLine, kind) {
  for (let line = startLine; line <= endLine; line += 1) {
    if (lineKinds[line] !== "code") {
      lineKinds[line] = kind;
    }
  }
}

function finalizeLineKinds(lines, lineKinds) {
  let blankLines = 0;
  let commentOnlyLines = 0;
  let effectiveCodeLines = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.length === 0) {
      lineKinds[index] = "blank";
      blankLines += 1;
      continue;
    }
    if (lineKinds[index] === "unknown") {
      lineKinds[index] = "code";
    }
    if (lineKinds[index] === "blank") {
      blankLines += 1;
    } else if (lineKinds[index] === "comment") {
      commentOnlyLines += 1;
    } else {
      effectiveCodeLines += 1;
    }
  }

  return { blankLines, commentOnlyLines, effectiveCodeLines };
}

function languageVariantForExtension(extension) {
  return extension === "tsx" || extension === "jsx"
    ? LANGUAGE_VARIANT_JSX
    : LANGUAGE_VARIANT_STANDARD;
}

function isCommentToken(token) {
  return token === SINGLE_LINE_COMMENT || token === MULTI_LINE_COMMENT;
}

function isIgnorableTrivia(token) {
  return (
    token === NEW_LINE_TRIVIA ||
    token === WHITESPACE_TRIVIA ||
    token === CONFLICT_MARKER_TRIVIA ||
    token === NON_TEXT_FILE_MARKER_TRIVIA ||
    token === JSX_TEXT_ALL_WHITESPACES
  );
}

function countJsTsMetrics(source, extension) {
  const lines = splitSourceLines(source);
  const physicalLines = lines.length;
  const lineKinds = Array.from({ length: lines.length }, () => "unknown");

  const languageVariant = languageVariantForExtension(extension);
  const scanner = createScanner(false, languageVariant, source);

  for (let pos = 0; pos < source.length;) {
    scanner.resetTokenState(pos);
    const token = scanner.scan();
    const start = scanner.getTokenStart();
    const end = scanner.getTokenEnd();
    if (end <= pos) {
      pos += 1;
      continue;
    }
    const startLine = lineNumberAt(source, start);
    const endLine = lineNumberAt(source, Math.max(start, end - 1));
    if (token === END_OF_FILE) {
      break;
    }
    if (isCommentToken(token)) {
      markLineRange(lineKinds, startLine, endLine, "comment");
    } else if (!isIgnorableTrivia(token)) {
      markLineRange(lineKinds, startLine, endLine, "code");
    }
    pos = end;
  }

  const totals = finalizeLineKinds(lines, lineKinds);
  return { physicalLines, ...totals };
}

function isRustIdentifierStart(character) {
  return (
    (character >= 65 && character <= 90) ||
    (character >= 97 && character <= 122) ||
    character === 95
  );
}

function isRustIdentifierPart(character) {
  return (
    isRustIdentifierStart(character) || (character >= 48 && character <= 57)
  );
}

function countRustMetrics(source) {
  const lines = splitSourceLines(source);
  const physicalLines = lines.length;
  const lineKinds = Array.from({ length: lines.length }, () => "unknown");
  let index = 0;

  while (index < source.length) {
    const startLine = lineNumberAt(source, index);
    const character = source[index];
    const next = source[index + 1];

    if (character === " " || character === "\t" || character === "\r") {
      index += 1;
      continue;
    }

    if (character === "\n") {
      index += 1;
      continue;
    }

    if (character === "/" && next === "/") {
      const end = source.indexOf("\n", index + 2);
      const endIndex = end === -1 ? source.length : end;
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(index, endIndex - 1)),
        "comment",
      );
      index = endIndex;
      continue;
    }

    if (character === "/" && next === "*") {
      index += 2;
      let depth = 1;
      while (index < source.length && depth > 0) {
        if (source[index] === "/" && source[index + 1] === "*") {
          depth += 1;
          index += 2;
          continue;
        }
        if (source[index] === "*" && source[index + 1] === "/") {
          depth -= 1;
          index += 2;
          continue;
        }
        index += 1;
      }
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(index - 1, 0)),
        "comment",
      );
      continue;
    }

    if (character === '"') {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(index - 1, 0)),
        "code",
      );
      continue;
    }

    if (character === "'") {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(index - 1, 0)),
        "code",
      );
      continue;
    }

    if (character === "b" && (next === "r" || next === "R")) {
      const rawMarker = index + 1;
      if (source[rawMarker] !== "r" && source[rawMarker] !== "R") {
        markLineRange(lineKinds, startLine, startLine, "code");
        index += 1;
        continue;
      }
      index = rawMarker + 1;
      let hashCount = 0;
      while (source[index] === "#") {
        hashCount += 1;
        index += 1;
      }
      if (source[index] !== '"') {
        markLineRange(lineKinds, startLine, startLine, "code");
        continue;
      }
      index += 1;
      const closing = `"${"#".repeat(hashCount)}`;
      while (index < source.length) {
        const closeIndex = source.indexOf(closing, index);
        if (closeIndex === -1) {
          index = source.length;
          break;
        }
        index = closeIndex + closing.length;
        break;
      }
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(index - 1, 0)),
        "code",
      );
      continue;
    }

    if (character === "r" || character === "R") {
      let cursor = index + 1;
      let hashCount = 0;
      while (source[cursor] === "#") {
        hashCount += 1;
        cursor += 1;
      }
      if (source[cursor] === '"') {
        cursor += 1;
        const closing = `"${"#".repeat(hashCount)}`;
        while (cursor < source.length) {
          const closeIndex = source.indexOf(closing, cursor);
          if (closeIndex === -1) {
            cursor = source.length;
            break;
          }
          cursor = closeIndex + closing.length;
          break;
        }
        markLineRange(
          lineKinds,
          startLine,
          lineNumberAt(source, Math.max(cursor - 1, 0)),
          "code",
        );
        index = cursor;
        continue;
      }
    }

    if (isRustIdentifierStart(character.charCodeAt(0))) {
      let cursor = index + 1;
      while (
        cursor < source.length &&
        isRustIdentifierPart(source.charCodeAt(cursor))
      ) {
        cursor += 1;
      }
      markLineRange(
        lineKinds,
        startLine,
        lineNumberAt(source, Math.max(cursor - 1, index)),
        "code",
      );
      index = cursor;
      continue;
    }

    markLineRange(lineKinds, startLine, startLine, "code");
    index += 1;
  }

  const totals = finalizeLineKinds(lines, lineKinds);
  return { physicalLines, ...totals };
}

export function measureProductionSource(source, filePath) {
  const extension = extensionForPath(filePath);
  if (JS_TS_EXTENSIONS.has(extension)) {
    return countJsTsMetrics(source, extension);
  }
  if (extension === "rs") {
    return countRustMetrics(source);
  }
  throw new Error(
    `Unsupported governed production source extension: ${filePath}`,
  );
}

export function formatBudgetFailure(filePath, metrics, failure) {
  const parts = [`${filePath}: ${failure.message}`];
  parts.push(`effective code lines: ${metrics.effectiveCodeLines}`);
  parts.push(`hard effective-code budget: ${HARD_EFFECTIVE_CODE_LINES}`);
  parts.push(`physical lines: ${metrics.physicalLines}`);
  parts.push(`physical safety limit: ${PHYSICAL_SAFETY_LINES}`);
  if (metrics.commentOnlyLines > 0) {
    parts.push(`comment-only lines: ${metrics.commentOnlyLines}`);
  }
  if (metrics.blankLines > 0) {
    parts.push(`blank lines: ${metrics.blankLines}`);
  }
  return parts.join("\n  ");
}

export function evaluateProductionSourceChange({
  filePath,
  baseSource,
  headSource,
  hasException,
}) {
  const headMetrics = measureProductionSource(headSource, filePath);
  const baseMetrics =
    baseSource === null || baseSource === undefined
      ? null
      : measureProductionSource(baseSource, filePath);
  const errors = [];

  if (baseMetrics === null) {
    if (headMetrics.effectiveCodeLines > HARD_EFFECTIVE_CODE_LINES) {
      errors.push(
        formatBudgetFailure(filePath, headMetrics, {
          message: "new production file exceeds effective code budget",
        }),
      );
    }
    if (headMetrics.physicalLines > PHYSICAL_SAFETY_LINES) {
      errors.push(
        formatBudgetFailure(filePath, headMetrics, {
          message: "new production file exceeds physical safety limit",
        }),
      );
    }
    return errors;
  }

  const effectiveGrowth =
    baseMetrics.effectiveCodeLines > HARD_EFFECTIVE_CODE_LINES &&
    headMetrics.effectiveCodeLines > baseMetrics.effectiveCodeLines;
  const physicalGrowth =
    baseMetrics.physicalLines > PHYSICAL_SAFETY_LINES &&
    headMetrics.physicalLines > baseMetrics.physicalLines;

  if (effectiveGrowth || physicalGrowth) {
    const allowed = hasException({
      path: filePath,
      baseMetrics,
      headMetrics,
    });
    if (!allowed) {
      if (effectiveGrowth) {
        errors.push(
          [
            `${filePath}: existing oversized file grew effective code lines from ${baseMetrics.effectiveCodeLines} to ${headMetrics.effectiveCodeLines}`,
            `  hard effective-code budget: ${HARD_EFFECTIVE_CODE_LINES}`,
            `  physical lines: ${baseMetrics.physicalLines} -> ${headMetrics.physicalLines}`,
          ].join("\n"),
        );
      }
      if (physicalGrowth) {
        errors.push(
          [
            `${filePath}: existing oversized file grew physical lines from ${baseMetrics.physicalLines} to ${headMetrics.physicalLines}`,
            `  physical safety limit: ${PHYSICAL_SAFETY_LINES}`,
            `  effective code lines: ${baseMetrics.effectiveCodeLines} -> ${headMetrics.effectiveCodeLines}`,
          ].join("\n"),
        );
      }
    }
  }

  return errors;
}
