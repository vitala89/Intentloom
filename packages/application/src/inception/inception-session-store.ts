import type { InceptionSessionState } from "@intentloom/protocol";
import { validateInceptionSessionState } from "@intentloom/validator";

const sessions = new Map<string, InceptionSessionState>();

export function clearInceptionSessionStore(): void {
  sessions.clear();
}

export function registerInceptionSession(
  session: InceptionSessionState,
): InceptionSessionState {
  const validated = validateInceptionSessionState(session);
  sessions.set(validated.id, validated);
  return validated;
}

export function getInceptionSessionStoreEntry(
  sessionId: string,
): InceptionSessionState | undefined {
  return sessions.get(sessionId);
}

export function updateInceptionSessionStoreEntry(
  session: InceptionSessionState,
): InceptionSessionState {
  const validated = validateInceptionSessionState(session);
  if (!sessions.has(validated.id)) {
    throw new Error(`unknown inception session '${validated.id}'`);
  }
  sessions.set(validated.id, validated);
  return validated;
}

export function deleteInceptionSessionStoreEntry(
  sessionId: string,
): InceptionSessionState {
  const existing = sessions.get(sessionId);
  if (existing === undefined) {
    throw new Error(`unknown inception session '${sessionId}'`);
  }
  sessions.delete(sessionId);
  return existing;
}

export function listInceptionSessionStoreIds(): readonly string[] {
  return [...sessions.keys()];
}

export function seedInceptionSessionStore(
  entries: readonly InceptionSessionState[],
): void {
  for (const entry of entries) {
    registerInceptionSession(entry);
  }
}
