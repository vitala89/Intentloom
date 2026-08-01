const BLUEPRINT_PREFIX = "blueprint for ";

export function sanitizeInceptionPackageName(name: string): string {
  const normalized = name.toLowerCase();
  const rawName = normalized.startsWith(BLUEPRINT_PREFIX)
    ? normalized.slice(BLUEPRINT_PREFIX.length)
    : normalized;
  const sanitized = Array.from(rawName)
    .map((ch) =>
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "-" ||
      ch === "_"
        ? ch
        : "-",
    )
    .join("");

  let start = 0;
  while (start < sanitized.length && sanitized[start] === "-") {
    start += 1;
  }

  let end = sanitized.length;
  while (end > start && sanitized[end - 1] === "-") {
    end -= 1;
  }

  return sanitized.slice(start, end);
}
