const SINGLE_WHITESPACE = /\s/u;

/**
 * Finds every `](target)` / `](target "title")` markdown link target in
 * `body`, in a single forward pass.
 *
 * Deliberately not a regex. `/\]\(([^)\s]+)(?:\s[^)]*)?\)/gu` reads as
 * polynomial to CodeQL (js/polynomial-redos): on unterminated input (a
 * `](` with no closing `)`), the unbounded `[^)\s]+` backtracks fully, and
 * the global scan retries that same backtrack at every subsequent `](`
 * occurrence, compounding to quadratic time.
 *
 * A naive manual scan has the same trap: scanning forward from `](` to
 * find `)` and, on failure, simply moving past that `](` and trying the
 * next one repeats the full forward scan every time (e.g. `](!` repeated
 * many times with no `)` anywhere). The fix is that failing to find `)`
 * anywhere in the remaining string proves no `](` at or after that point
 * can ever complete a match either, so that failure ends the whole scan
 * instead of restarting nearby.
 */
export function findMarkdownLinkTargets(body: string): string[] {
  const targets: string[] = [];
  let pos = 0;

  while (pos < body.length) {
    const markerIndex = body.indexOf("](", pos);
    if (markerIndex === -1) break;

    let i = markerIndex + 2;
    const targetStart = i;
    while (
      i < body.length &&
      body[i] !== ")" &&
      !SINGLE_WHITESPACE.test(body[i]!)
    ) {
      i += 1;
    }
    const target = body.slice(targetStart, i);

    if (target.length === 0) {
      // Nothing consumed before hitting `)`/whitespace/end: this `](`
      // cannot match. Retrying right after it is O(1) work.
      pos = markerIndex + 2;
      continue;
    }
    if (i >= body.length) {
      // No `)` or whitespace anywhere after targetStart: no `)` exists in
      // the rest of the string, so no later `](` can complete either.
      break;
    }

    if (SINGLE_WHITESPACE.test(body[i]!)) {
      i += 1;
      while (i < body.length && body[i] !== ")") i += 1;
      if (i >= body.length) break; // same reasoning: no `)` left at all
    }

    if (body[i] === ")") targets.push(target);
    pos = i + 1;
  }

  return targets;
}
