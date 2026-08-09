interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseVersion(value: string): Version | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/u.exec(value);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compare(left: Version, right: Version): number {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}

function satisfiesComparator(version: Version, token: string): boolean {
  const match = /^(\^|~|>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/u.exec(token);
  if (!match) return false;
  const target = parseVersion(match[2]!);
  if (!target) return false;
  const operator = match[1] ?? "=";
  if (operator === "^") {
    const upper =
      target.major > 0
        ? { major: target.major + 1, minor: 0, patch: 0 }
        : { major: 0, minor: target.minor + 1, patch: 0 };
    return compare(version, target) >= 0 && compare(version, upper) < 0;
  }
  if (operator === "~") {
    const upper = { major: target.major, minor: target.minor + 1, patch: 0 };
    return compare(version, target) >= 0 && compare(version, upper) < 0;
  }
  const comparison = compare(version, target);
  return operator === ">="
    ? comparison >= 0
    : operator === "<="
      ? comparison <= 0
      : operator === ">"
        ? comparison > 0
        : operator === "<"
          ? comparison < 0
          : comparison === 0;
}

export function satisfiesVersionRange(
  versionValue: string,
  range: string,
): boolean {
  const version = parseVersion(versionValue);
  if (!version) return false;
  if (range === "*") return true;
  return range
    .split(/\s+/u)
    .every((token) => satisfiesComparator(version, token));
}
