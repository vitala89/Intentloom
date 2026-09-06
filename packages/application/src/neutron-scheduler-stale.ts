import { checksum } from "@intentloom/core";
import type {
  AgentRoleCapabilities,
  ProfileDefinition,
  TaskCheckpoint,
} from "../../protocol/src/index.js";
import { compareNeutronTaskIds } from "./neutron-scheduler-sort.js";

export const NEUTRON_GRAPH_STALE_KINDS = [
  "project",
  "checkpoint",
  "profile",
] as const;

export type NeutronGraphStaleKind = (typeof NEUTRON_GRAPH_STALE_KINDS)[number];

export interface NeutronCheckpointAuthority {
  readonly checkpointId: string;
  readonly taskId: string;
  readonly state: string;
  readonly updatedAt: string;
  readonly createdSnapshotChecksum: string;
}

export interface NeutronProfileAuthority {
  readonly profileName: string;
  readonly fingerprint: string;
}

export interface NeutronGraphStaleBaseline {
  readonly projectFingerprint: string;
  readonly checkpoint?: NeutronCheckpointAuthority;
  readonly profile?: NeutronProfileAuthority;
}

export type NeutronGraphStaleSnapshot = NeutronGraphStaleBaseline;

export interface NeutronGraphStaleMismatch {
  readonly kind: NeutronGraphStaleKind;
  readonly expected: string;
  readonly current: string;
}

export interface NeutronGraphStaleReport {
  readonly accepted: boolean;
  readonly rerunAttempted: false;
  readonly kinds: readonly NeutronGraphStaleKind[];
  readonly mismatches: readonly NeutronGraphStaleMismatch[];
}

export function snapshotNeutronCheckpoint(
  checkpoint: TaskCheckpoint,
): NeutronCheckpointAuthority {
  return {
    checkpointId: checkpoint.id,
    createdSnapshotChecksum: checkpoint.createdSnapshotChecksum,
    state: checkpoint.state,
    taskId: checkpoint.taskId,
    updatedAt: checkpoint.updatedAt,
  };
}

export function fingerprintNeutronProfileAuthority(input: {
  readonly profileName: string;
  readonly allowedTools?: readonly string[];
  readonly activeRoles?: readonly string[];
  readonly capabilities?: Pick<
    AgentRoleCapabilities,
    "readOnly" | "allowNetwork" | "maxBudget" | "allowedPaths"
  >;
}): string {
  return `sha256:${checksum(
    JSON.stringify(
      canonicalize({
        activeRoles: [...(input.activeRoles ?? [])].sort(compareNeutronTaskIds),
        allowNetwork: input.capabilities?.allowNetwork ?? false,
        allowedPaths: [...(input.capabilities?.allowedPaths ?? [])].sort(
          compareNeutronTaskIds,
        ),
        allowedTools: [...(input.allowedTools ?? [])].sort(
          compareNeutronTaskIds,
        ),
        maxBudget: input.capabilities?.maxBudget ?? 0,
        profileName: input.profileName,
        readOnly: input.capabilities?.readOnly ?? true,
      }),
    ),
  )}`;
}

export function snapshotNeutronProfile(
  profile: ProfileDefinition,
): NeutronProfileAuthority {
  return {
    fingerprint: fingerprintNeutronProfileAuthority({
      activeRoles: profile.activeRoles,
      allowedTools: profile.allowedCapabilities.allowedTools,
      capabilities: profile.allowedCapabilities,
      profileName: profile.name,
    }),
    profileName: profile.name,
  };
}

export function detectNeutronGraphStaleness(input: {
  readonly baseline: NeutronGraphStaleBaseline;
  readonly current: NeutronGraphStaleSnapshot;
}): NeutronGraphStaleReport {
  const mismatches: NeutronGraphStaleMismatch[] = [];
  pushMismatch(
    mismatches,
    "project",
    input.baseline.projectFingerprint,
    input.current.projectFingerprint,
  );
  compareOptional(
    mismatches,
    "checkpoint",
    input.baseline.checkpoint,
    input.current.checkpoint,
    checkpointKey,
  );
  compareOptional(
    mismatches,
    "profile",
    input.baseline.profile,
    input.current.profile,
    profileKey,
  );
  const kinds = NEUTRON_GRAPH_STALE_KINDS.filter((kind) =>
    mismatches.some((item) => item.kind === kind),
  );
  return {
    accepted: mismatches.length === 0,
    kinds,
    mismatches,
    rerunAttempted: false,
  };
}

function compareOptional<T>(
  mismatches: NeutronGraphStaleMismatch[],
  kind: NeutronGraphStaleKind,
  baseline: T | undefined,
  current: T | undefined,
  key: (value: T) => string,
): void {
  if (baseline === undefined && current === undefined) return;
  pushMismatch(
    mismatches,
    kind,
    baseline === undefined ? "" : key(baseline),
    current === undefined ? "" : key(current),
  );
}

function pushMismatch(
  mismatches: NeutronGraphStaleMismatch[],
  kind: NeutronGraphStaleKind,
  expected: string,
  current: string,
): void {
  if (expected === current) return;
  mismatches.push({ current, expected, kind });
}

function checkpointKey(value: NeutronCheckpointAuthority): string {
  return [
    value.checkpointId,
    value.taskId,
    value.state,
    value.updatedAt,
    value.createdSnapshotChecksum,
  ].join("\u001f");
}

function profileKey(value: NeutronProfileAuthority): string {
  return `${value.profileName}\u001f${value.fingerprint}`;
}

function canonicalize(value: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(value).sort(compareNeutronTaskIds);
  const next: Record<string, unknown> = {};
  for (const key of keys) next[key] = value[key];
  return next;
}
