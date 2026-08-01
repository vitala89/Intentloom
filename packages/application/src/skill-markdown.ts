/**
 * Extracts the body of a `## <header>` markdown section: everything after the
 * header line up to (but not including) the next `## ` section header or the
 * end of the string.
 *
 * Deliberately avoids `/## header\r?\n([\s\S]*?)(?=\r?\n## |$)/u`-style
 * patterns: the lazy `[\s\S]*?` re-tests the `\r?\n## |$` lookahead at every
 * position, and since `\r?` can also match at the position the lookahead's
 * own `\n` occupies, backtracking degrades to quadratic time on inputs with
 * many newlines and no matching header (CodeQL js/polynomial-redos).
 */
export function extractMarkdownSection(
  body: string,
  header: string,
): string | undefined {
  const marker = `## ${header}`;
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return undefined;

  let contentStart = markerIndex + marker.length;
  if (body[contentStart] === "\r") contentStart += 1;
  if (body[contentStart] !== "\n") return undefined;
  contentStart += 1;

  const nextHeaderIndex = body.indexOf("\n## ", contentStart);
  let contentEnd = nextHeaderIndex === -1 ? body.length : nextHeaderIndex;
  if (contentEnd > contentStart && body[contentEnd - 1] === "\r") {
    contentEnd -= 1;
  }

  return body.slice(contentStart, contentEnd);
}
