/** Shelf geometry is in world meters. The open winter frame is a ceiling, never a support. */
export type WinterContentsShelf = Readonly<{
  y: number;
  height: number;
  variant: string;
}>;

function nearestShelf(shelves: readonly WinterContentsShelf[], y: number, direction: -1 | 1) {
  const candidates = shelves.filter(
    shelf => Number.isFinite(shelf.y) && Number.isFinite(shelf.height) && (shelf.y - y) * direction > 0.0001
  );
  candidates.sort((a, b) => direction * (a.y - b.y));
  return candidates[0] ?? null;
}

export function isCellBelowWinterBrace(shelves: readonly WinterContentsShelf[], shelfY: number): boolean {
  return nearestShelf(shelves, shelfY, 1)?.variant === 'winter_brace';
}

export function resolveWinterBlanketSupport(args: {
  shelves: readonly WinterContentsShelf[];
  winterY: number;
  winterHeight: number;
  bottomY: number;
  clearance: number;
}): { shelfTopY: number; maxHeight: number } | null {
  const { shelves, winterY, winterHeight, bottomY, clearance } = args;
  if (![winterY, winterHeight, bottomY, clearance].every(Number.isFinite)) return null;
  const below = nearestShelf(shelves, winterY, -1);
  // Consecutive open frames have no solid platform between them.
  if (below?.variant === 'winter_brace') return null;
  const shelfTopY = below ? below.y + below.height / 2 : bottomY;
  const maxHeight = winterY - winterHeight / 2 - clearance - shelfTopY;
  return shelfTopY < winterY && maxHeight > 0 ? { shelfTopY, maxHeight } : null;
}
