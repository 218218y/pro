import type { RaycastHitLike } from './canvas_picking_engine.js';

type ShelfBoardPickSource = 'board' | 'fallback';

export type ShelfBoardPick = {
  source: ShelfBoardPickSource;
  shelfIndex: number;
  shelfY: number;
  hitY: number;
};

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readUserData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const userData = (value as { userData?: unknown }).userData;
  return userData && typeof userData === 'object' && !Array.isArray(userData)
    ? (userData as Record<string, unknown>)
    : null;
}

function isShelfBoardUserData(userData: Record<string, unknown> | null): boolean {
  if (!userData) return false;
  if (userData.__kind === 'shelf_pin' || userData.__kind === 'brace_seam') return false;
  return userData.partId === 'all_shelves' || userData.partId === 'corner_shelves';
}

function resolveShelfIndexFromHitY(args: {
  hitY: number;
  bottomY: number;
  step: number;
  divisions: number;
}): { shelfIndex: number; shelfY: number } | null {
  const { hitY, bottomY, step, divisions } = args;
  if (!Number.isFinite(hitY) || !Number.isFinite(bottomY) || !Number.isFinite(step) || step <= 0) {
    return null;
  }
  if (!Number.isFinite(divisions) || divisions <= 1) return null;

  let shelfIndex = Math.round((hitY - bottomY) / step);
  if (shelfIndex < 1) shelfIndex = 1;
  if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;
  return { shelfIndex, shelfY: bottomY + shelfIndex * step };
}

function readShelfBoardHitY(hit: RaycastHitLike | null | undefined): number | null {
  if (!hit || !isShelfBoardUserData(readUserData(hit.object))) return null;
  return readFiniteNumber(hit.point?.y);
}

export function resolveShelfBoardPickFromIntersects(args: {
  intersects: readonly RaycastHitLike[] | null | undefined;
  bottomY: number;
  step: number;
  divisions: number;
  toleranceM: number;
}): ShelfBoardPick | null {
  const { intersects, bottomY, step, divisions, toleranceM } = args;
  const hits = Array.isArray(intersects) ? intersects : [];
  const tolerance = Number.isFinite(toleranceM) && toleranceM >= 0 ? toleranceM : 0;

  for (let i = 0; i < hits.length; i += 1) {
    const hitY = readShelfBoardHitY(hits[i]);
    if (hitY == null) continue;

    const resolved = resolveShelfIndexFromHitY({ hitY, bottomY, step, divisions });
    if (!resolved) continue;
    if (Math.abs(hitY - resolved.shelfY) > tolerance) continue;

    return {
      source: 'board',
      shelfIndex: resolved.shelfIndex,
      shelfY: resolved.shelfY,
      hitY,
    };
  }

  return null;
}

export function resolveShelfBoardPick(args: {
  intersects: readonly RaycastHitLike[] | null | undefined;
  fallbackHitY: number | null;
  bottomY: number;
  topY: number;
  divisions: number;
  boardToleranceM: number;
  fallbackToleranceM: number;
}): ShelfBoardPick | null {
  const { intersects, fallbackHitY, bottomY, topY, divisions, boardToleranceM, fallbackToleranceM } = args;
  const totalHeight = topY - bottomY;
  const step = totalHeight / divisions;
  if (!Number.isFinite(step) || step <= 0) return null;

  const boardPick = resolveShelfBoardPickFromIntersects({
    intersects,
    bottomY,
    step,
    divisions,
    toleranceM: boardToleranceM,
  });
  if (boardPick) return boardPick;

  if (typeof fallbackHitY !== 'number' || !Number.isFinite(fallbackHitY)) return null;
  const fallback = resolveShelfIndexFromHitY({ hitY: fallbackHitY, bottomY, step, divisions });
  const tolerance = Number.isFinite(fallbackToleranceM) && fallbackToleranceM >= 0 ? fallbackToleranceM : 0;
  if (!fallback || Math.abs(fallbackHitY - fallback.shelfY) > tolerance) return null;

  return {
    source: 'fallback',
    shelfIndex: fallback.shelfIndex,
    shelfY: fallback.shelfY,
    hitY: fallbackHitY,
  };
}
