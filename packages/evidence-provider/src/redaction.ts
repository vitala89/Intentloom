import { createHash } from "node:crypto";

const REDACTED_TOKEN = "[REDACTED_TOKEN]";
const TOKEN_PREFIXES = ["github_pat_", "ghp_", "glpat-"] as const;

function isEmailLocalChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 33 ||
    code === 35 ||
    code === 36 ||
    code === 37 ||
    code === 38 ||
    code === 39 ||
    code === 42 ||
    code === 43 ||
    code === 45 ||
    code === 47 ||
    code === 61 ||
    code === 63 ||
    code === 94 ||
    code === 95 ||
    code === 96 ||
    code === 123 ||
    code === 124 ||
    code === 125 ||
    code === 126
  );
}

function isDomainChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 ||
    code === 46
  );
}

function isTokenChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 ||
    code === 95
  );
}

function tokenEnd(value: string, start: number): number | undefined {
  for (const prefix of TOKEN_PREFIXES) {
    if (!value.startsWith(prefix, start)) continue;
    let end = start + prefix.length;
    while (end < value.length && isTokenChar(value.charCodeAt(end))) end += 1;
    const payloadLength = end - start - prefix.length;
    if (payloadLength >= (prefix === "ghp_" ? 36 : 20)) return end;
  }
  return undefined;
}

function emailEnd(value: string, start: number): number | undefined {
  let localEnd = start;
  while (
    localEnd < value.length &&
    isEmailLocalChar(value.charCodeAt(localEnd))
  )
    localEnd += 1;
  if (localEnd === start || value[localEnd] !== "@") return undefined;

  let domainEnd = localEnd + 1;
  let hasDot = false;
  while (
    domainEnd < value.length &&
    isDomainChar(value.charCodeAt(domainEnd))
  ) {
    if (value[domainEnd] === ".") hasDot = true;
    domainEnd += 1;
  }
  return hasDot && domainEnd > localEnd + 2 ? domainEnd : undefined;
}

function userPseudonym(email: string): string {
  return `usr_${createHash("sha256").update(email).digest("hex").slice(0, 12)}`;
}

export function redactProviderString(value: string, max: number): string {
  const bounded = value.slice(0, max + 128);
  let output = "";
  let index = 0;
  while (index < bounded.length && output.length < max) {
    const tokenStop = tokenEnd(bounded, index);
    if (tokenStop !== undefined) {
      output += REDACTED_TOKEN;
      index = tokenStop;
      continue;
    }
    const emailStop = emailEnd(bounded, index);
    if (emailStop !== undefined) {
      output += userPseudonym(bounded.slice(index, emailStop));
      index = emailStop;
      continue;
    }
    output += bounded[index];
    index += 1;
  }
  return output.slice(0, max);
}
