import { AsyncLocalStorage } from "node:async_hooks";
import { resolve } from "node:path";

const heldRoot = new AsyncLocalStorage<string>();
const tails = new Map<string, Promise<void>>();

export function canonicalMutationLockKey(root: string): string {
  return resolve(root);
}

export async function withCanonicalProjectRootLock<T>(
  root: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = canonicalMutationLockKey(root);
  if (heldRoot.getStore() === key) return operation();
  const box: { done?: () => void } = {};
  const current = new Promise<void>((ok) => {
    box.done = ok;
  });
  const previous = tails.get(key) ?? Promise.resolve();
  tails.set(
    key,
    previous.then(() => current),
  );
  await previous;
  try {
    return await heldRoot.run(key, operation);
  } finally {
    box.done?.();
  }
}
