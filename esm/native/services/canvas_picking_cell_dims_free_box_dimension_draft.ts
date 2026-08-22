export type CellDimsFreeBoxDimensionDraft = {
  currentCm: number | null;
  targetCm: number | null | undefined;
};

export function hasCellDimsFreeBoxNewDimensionValueChange(
  drafts: readonly CellDimsFreeBoxDimensionDraft[],
  toleranceCm: number
): boolean {
  const tolerance = Number.isFinite(toleranceCm) ? Math.max(0, toleranceCm) : 0;
  for (const draft of drafts) {
    const target = draft.targetCm;
    if (target == null || !Number.isFinite(target) || target <= 0) continue;
    const current = draft.currentCm;
    if (current == null || !Number.isFinite(current) || current <= 0) return true;
    if (Math.abs(target - current) > tolerance) return true;
  }
  return false;
}
