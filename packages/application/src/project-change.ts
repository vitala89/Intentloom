export type ChangeKind =
  | "create"
  | "update"
  | "conflict"
  | "modified"
  | "missing"
  | "stale"
  | "security-error";

export interface Change {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly reason: string;
  readonly content?: string;
}

export interface Plan {
  readonly changes: readonly Change[];
  readonly diagnostics: readonly string[];
}
