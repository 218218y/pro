export type NotesOverlayPaletteLayoutSpec = {
  itemSelector: string;
  defaultItemCount: number;
  itemHeight: number;
  itemGap: number;
  paddingY: number;
  minMaxHeight: number;
  reportKey: string;
};

export const NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC: NotesOverlayPaletteLayoutSpec = {
  itemSelector: '.color-swatch',
  defaultItemCount: 4,
  itemHeight: 24,
  itemGap: 4,
  paddingY: 4,
  minMaxHeight: 60,
  reportKey: 'CTRL_paletteColor',
};

export const NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC: NotesOverlayPaletteLayoutSpec = {
  itemSelector: '.size-swatch',
  defaultItemCount: 5,
  itemHeight: 32,
  itemGap: 6,
  paddingY: 6,
  minMaxHeight: 80,
  reportKey: 'CTRL_paletteSize',
};

export function estimateNotesOverlayPaletteHeight(args: {
  itemCount: number;
  spec: NotesOverlayPaletteLayoutSpec;
}): number {
  const { itemCount, spec } = args;
  const effectiveCount = Math.max(0, Number.isFinite(itemCount) ? Math.floor(itemCount) : 0);
  return (
    effectiveCount * spec.itemHeight + Math.max(0, effectiveCount - 1) * spec.itemGap + spec.paddingY * 2 + 2
  );
}

export function resolveNotesOverlayPaletteItemCount(args: {
  measuredCount: number;
  spec: NotesOverlayPaletteLayoutSpec;
}): number {
  const { measuredCount, spec } = args;
  if (Number.isFinite(measuredCount) && measuredCount > 0) return Math.floor(measuredCount);
  return spec.defaultItemCount;
}

export function resolveNotesOverlayPaletteLayout(args: {
  hostTop: number;
  hostBottom: number;
  anchorTop: number;
  anchorBottom: number;
  paletteHeight: number;
  minMaxHeight: number;
  margin?: number;
}): { openUp: boolean; maxHeight: number } {
  const { hostTop, hostBottom, anchorTop, anchorBottom, paletteHeight, minMaxHeight, margin = 8 } = args;
  const spaceBelow = hostBottom - anchorBottom - margin;
  const spaceAbove = anchorTop - hostTop - margin;
  const openUp = spaceBelow < paletteHeight && spaceAbove > 0;
  const maxHeight = Math.max(minMaxHeight, openUp ? spaceAbove : spaceBelow);
  return {
    openUp,
    maxHeight: Math.floor(maxHeight),
  };
}

export function resolveNotesOverlayMeasuredPaletteLayout(args: {
  hostTop: number;
  hostBottom: number;
  anchorTop: number;
  anchorBottom: number;
  measuredCount: number;
  paletteScrollHeight: number;
  spec: NotesOverlayPaletteLayoutSpec;
  margin?: number;
}): { openUp: boolean; maxHeight: number; itemCount: number; paletteHeight: number } {
  const { hostTop, hostBottom, anchorTop, anchorBottom, measuredCount, paletteScrollHeight, spec, margin } =
    args;
  const itemCount = resolveNotesOverlayPaletteItemCount({ measuredCount, spec });
  const estimatedHeight = estimateNotesOverlayPaletteHeight({ itemCount, spec });
  const paletteHeight = Math.max(0, paletteScrollHeight || 0, estimatedHeight);
  const layout = resolveNotesOverlayPaletteLayout({
    hostTop,
    hostBottom,
    anchorTop,
    anchorBottom,
    paletteHeight,
    minMaxHeight: spec.minMaxHeight,
    margin,
  });
  return {
    ...layout,
    itemCount,
    paletteHeight,
  };
}
