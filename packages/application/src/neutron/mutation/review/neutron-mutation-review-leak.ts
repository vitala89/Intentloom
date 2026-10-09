const LEAK_KEYS = [
  "approvalToken",
  "grantedApprovals",
  "previousContent",
  "prompts",
  "reasoning",
] as const;

export function neutronMutationReviewLeakKeys(
  value: unknown,
): readonly string[] {
  const serialized = JSON.stringify(value);
  return LEAK_KEYS.filter((key) => serialized.includes(`"${key}"`));
}

export function neutronMutationReviewLeaksSecret(
  value: unknown,
  secret: string,
): boolean {
  if (secret.length === 0) return false;
  return JSON.stringify(value).includes(secret);
}
