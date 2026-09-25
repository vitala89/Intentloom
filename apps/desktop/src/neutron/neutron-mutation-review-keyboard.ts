export function mutationReviewMoveIndex(
  index: number,
  length: number,
  key: string,
): number | null {
  if (length === 0) return null;
  const current = index < 0 ? 0 : index;
  if (key === "ArrowDown" || key === "ArrowRight") {
    return (current + 1) % length;
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    return (current - 1 + length) % length;
  }
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}
