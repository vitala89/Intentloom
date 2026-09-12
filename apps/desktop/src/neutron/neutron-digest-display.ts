export function shortenDigest(digest: string): string {
  if (digest.length <= 20) return digest;
  return `${digest.slice(0, 12)}…${digest.slice(-6)}`;
}
