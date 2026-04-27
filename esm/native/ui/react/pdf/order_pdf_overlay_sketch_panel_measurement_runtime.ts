export type SketchToolbarPlacement = {
  mode: 'inline' | 'fixed';
  top: number;
  left: number;
  right: number;
  maxHeight: number;
};

export type SketchToolbarSide = 'left' | 'right';

export type SketchFloatingPalettePlacement = {
  top: number;
  left: number;
  maxHeight: number;
};

type RectLike = {
  top: number;
  left: number;
  right: number;
  height: number;
};

export const DEFAULT_TOOLBAR_PLACEMENT: SketchToolbarPlacement = {
  mode: 'fixed',
  top: 96,
  left: 18,
  right: 18,
  maxHeight: 0,
};

export function resolveOrderPdfSketchToolbarPlacement(args: {
  win: Window;
  stage: HTMLDivElement | null;
  toolbarHeight: number;
  side?: SketchToolbarSide;
}): SketchToolbarPlacement {
  const { win, stage, toolbarHeight, side = 'right' } = args;
  const viewportWidth = Number.isFinite(win.innerWidth) ? win.innerWidth : 0;
  const viewportHeight = Number.isFinite(win.innerHeight) ? win.innerHeight : 0;
  if (viewportWidth > 0 && viewportWidth <= 980) {
    return { mode: 'inline', top: 76, left: 0, right: 0, maxHeight: 0 };
  }

  const safeGap = 18;
  if (!stage || !viewportHeight || !Number.isFinite(toolbarHeight) || toolbarHeight <= 0) {
    return {
      mode: 'fixed',
      top: 96,
      left: safeGap,
      right: safeGap,
      maxHeight: Math.max(220, viewportHeight - safeGap * 2),
    };
  }

  const stageRect = stage.getBoundingClientRect();
  const visibleTop = Math.max(safeGap, Math.round(stageRect.top) + safeGap);
  const visibleBottom = Math.min(viewportHeight - safeGap, Math.round(stageRect.bottom) - safeGap);
  const availableHeight = Math.max(1, visibleBottom - visibleTop);
  const centeredTop = Math.round(visibleTop + (availableHeight - toolbarHeight) / 2);
  const maxTop = Math.max(visibleTop, visibleBottom - toolbarHeight);
  const top = Math.min(Math.max(visibleTop, centeredTop), maxTop);

  const stageRight = Number.isFinite(stageRect.right) ? stageRect.right : viewportWidth - safeGap;
  const right = Math.max(safeGap, Math.round(viewportWidth - stageRight) + safeGap);
  const stageLeft = Number.isFinite(stageRect.left) ? stageRect.left : safeGap;
  const left = Math.max(safeGap, Math.round(stageLeft) + safeGap);

  return {
    mode: 'fixed',
    top,
    left: side === 'left' ? left : safeGap,
    right: side === 'right' ? right : safeGap,
    maxHeight: availableHeight,
  };
}

export function resolveOrderPdfSketchFloatingPalettePlacement(args: {
  win: Window;
  triggerRect: RectLike;
  paletteWidth: number;
  paletteHeight: number;
}): SketchFloatingPalettePlacement {
  const { win, triggerRect, paletteWidth, paletteHeight } = args;
  const viewportWidth = Number.isFinite(win.innerWidth) ? win.innerWidth : 0;
  const viewportHeight = Number.isFinite(win.innerHeight) ? win.innerHeight : 0;
  const safeGap = 12;
  const paletteGap = 12;
  const maxHeight = Math.max(180, viewportHeight - safeGap * 2);
  const effectiveHeight = Math.min(Math.max(1, paletteHeight), maxHeight);
  const centeredTop = Math.round(triggerRect.top + triggerRect.height / 2 - effectiveHeight / 2);
  const top = Math.min(
    Math.max(safeGap, centeredTop),
    Math.max(safeGap, viewportHeight - safeGap - effectiveHeight)
  );
  const preferredLeft = Math.round(triggerRect.left - paletteGap - Math.max(1, paletteWidth));
  const maxLeft = Math.max(safeGap, viewportWidth - safeGap - Math.max(1, paletteWidth));
  const left = Math.min(Math.max(safeGap, preferredLeft), maxLeft);

  return {
    top,
    left,
    maxHeight,
  };
}

export function areOrderPdfSketchFloatingPalettePlacementsEqual(
  prev: SketchFloatingPalettePlacement | null,
  next: SketchFloatingPalettePlacement
): boolean {
  return !!prev && prev.top === next.top && prev.left === next.left && prev.maxHeight === next.maxHeight;
}

export function areOrderPdfSketchToolbarPlacementsEqual(
  prev: SketchToolbarPlacement,
  next: SketchToolbarPlacement
): boolean {
  return (
    prev.mode === next.mode &&
    prev.top === next.top &&
    prev.left === next.left &&
    prev.right === next.right &&
    prev.maxHeight === next.maxHeight
  );
}
