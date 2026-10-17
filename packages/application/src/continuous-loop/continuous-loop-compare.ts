import type {
  ContinuousLoopChangeKind,
  ContinuousLoopComparison,
  ContinuousLoopSnapshot,
} from "@intentloom/protocol";

export function snapshotsAreCompatible(
  previous: ContinuousLoopSnapshot,
  current: ContinuousLoopSnapshot,
): boolean {
  return (
    previous.schemaVersion === current.schemaVersion &&
    previous.projectId === current.projectId
  );
}

export function inferLoopChangeKind(
  previous: ContinuousLoopSnapshot,
  current: ContinuousLoopSnapshot,
): ContinuousLoopChangeKind {
  if (previous.schemaVersion !== current.schemaVersion) return "policy";
  const prevSet = new Set(previous.findingIds);
  const currSet = new Set(current.findingIds);
  const findingsChanged =
    previous.findingIds.some((id) => !currSet.has(id)) ||
    current.findingIds.some((id) => !prevSet.has(id));
  if (findingsChanged) return "code";
  if (
    previous.technicalDebtItemCount !== current.technicalDebtItemCount ||
    previous.architectureViolationCount !== current.architectureViolationCount
  ) {
    return "evidence";
  }
  return "code";
}

export function compareLoopSnapshots(
  previous: ContinuousLoopSnapshot,
  current: ContinuousLoopSnapshot,
  requestedKind?: ContinuousLoopChangeKind,
): ContinuousLoopComparison {
  const prevSet = new Set(previous.findingIds);
  const currSet = new Set(current.findingIds);
  return {
    compatible: snapshotsAreCompatible(previous, current),
    changeKind: requestedKind ?? inferLoopChangeKind(previous, current),
    newFindingIds: current.findingIds.filter((id) => !prevSet.has(id)),
    fixedFindingIds: previous.findingIds.filter((id) => !currSet.has(id)),
    unchangedFindingIds: current.findingIds.filter((id) => prevSet.has(id)),
    technicalDebtItemDelta:
      current.technicalDebtItemCount - previous.technicalDebtItemCount,
    architectureDriftDelta:
      current.architectureViolationCount - previous.architectureViolationCount,
  };
}
