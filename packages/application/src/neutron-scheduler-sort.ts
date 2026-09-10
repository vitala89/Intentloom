export function compareNeutronTaskIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sortNeutronTaskIds(taskIds: readonly string[]): string[] {
  const ordered = [...taskIds];
  ordered.sort(compareNeutronTaskIds);
  return ordered;
}
