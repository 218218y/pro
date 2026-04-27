import type { AppContainer } from '../../../types/index.js';

import { reportPostBuildSoft } from './post_build_extras_shared.js';

type StackSplitDimensionThreeLike = {
  Vector3?: new (x?: number, y?: number, z?: number) => { x: number; y: number; z: number };
};

function readStackSplitDimensionThreeLike(value: unknown): StackSplitDimensionThreeLike | null {
  return value && typeof value === 'object' ? value : null;
}

export function appendStackSplitDimensionLines(args: {
  App: AppContainer;
  THREE: unknown;
  addDimensionLine: unknown;
  stackSplitActive: boolean;
  splitBottomHeightCm: number;
  dimH: number;
  totalW: number | null | undefined;
  isCornerMode: boolean;
  cornerSide: 'left' | 'right';
  stackKey: 'top' | 'bottom' | null;
}): void {
  const {
    App,
    THREE,
    addDimensionLine,
    stackSplitActive,
    splitBottomHeightCm,
    dimH,
    totalW,
    isCornerMode,
    cornerSide,
    stackKey,
  } = args;

  if (
    !stackSplitActive ||
    !Number.isFinite(splitBottomHeightCm) ||
    splitBottomHeightCm <= 0 ||
    !Number.isFinite(dimH) ||
    dimH <= 0
  ) {
    return;
  }

  try {
    const three = readStackSplitDimensionThreeLike(THREE);
    const addLine = typeof addDimensionLine === 'function' ? addDimensionLine : null;
    const totalWm = typeof totalW === 'number' ? totalW : NaN;
    if (!three?.Vector3 || !addLine || !Number.isFinite(totalWm) || totalWm <= 0) return;

    const bottomHm = splitBottomHeightCm / 100;
    const topHm = dimH - bottomHm;
    if (!(bottomHm > 0 && topHm > 0)) return;

    const heightOffsetX = 0.54;
    const dimsOnLeft = isCornerMode && cornerSide === 'right';
    const heightLineX = dimsOnLeft ? -totalWm / 2 - heightOffsetX : totalWm / 2 + heightOffsetX;
    const splitX = dimsOnLeft ? heightLineX + 0.12 : heightLineX - 0.12;
    const textOffset = dimsOnLeft ? new three.Vector3(-0.08, 0, 0) : new three.Vector3(0.08, 0, 0);

    addLine(
      new three.Vector3(splitX, 0, 0),
      new three.Vector3(splitX, bottomHm, 0),
      textOffset,
      (bottomHm * 100).toFixed(0),
      0.78
    );

    addLine(
      new three.Vector3(splitX, bottomHm, 0),
      new three.Vector3(splitX, dimH, 0),
      textOffset,
      (topHm * 100).toFixed(0),
      0.78
    );
  } catch (error) {
    reportPostBuildSoft(App, 'dimensions.stackSplitHelperLines', error, { stackKey: stackKey || null });
  }
}
