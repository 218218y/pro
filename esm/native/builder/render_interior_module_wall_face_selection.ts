/**
 * The wardrobe group may contain identically named dividers from different
 * stacked units (and different module subdivisions). A part id alone is not
 * a geometric identity. The module loop already knows the physical opening;
 * a rendered wall is usable only when its face agrees with that opening.
 */
export const MODULE_WALL_FACE_MATCH_TOLERANCE_M = 0.004;

export function pickMatchingModuleWallFace<T>(
  candidates: readonly T[],
  expectedFaceX: number,
  faceX: (candidate: T) => number
): number | null {
  if (!Number.isFinite(expectedFaceX)) return null;
  let bestFace: number | null = null;
  let bestDistance = MODULE_WALL_FACE_MATCH_TOLERANCE_M;
  for (const candidate of candidates) {
    const x = faceX(candidate);
    if (!Number.isFinite(x)) continue;
    const distance = Math.abs(x - expectedFaceX);
    if (distance <= bestDistance) {
      bestFace = x;
      bestDistance = distance;
    }
  }
  return bestFace;
}
