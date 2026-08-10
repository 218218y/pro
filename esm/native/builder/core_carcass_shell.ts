// Builder core carcass shell board and back-panel assembly.

import { __asNum } from './core_pure_shared.js';
import type { CarcassBackPanelOp, CarcassBoardOp, CarcassShellPlan } from './carcass_shell_ir.js';
import { CARCASS_SHELL_DIMENSIONS } from '../../shared/dimensions/carcass_shell_policy.js';
import {
  CARCASS_BACK_INSET_Z,
  CARCASS_FRONT_INSET_Z,
  type PreparedCarcassInput,
} from './core_carcass_shared.js';

const SHELL_DIMENSIONS = CARCASS_SHELL_DIMENSIONS;

export type CarcassShellResult = CarcassShellPlan;

export function buildCarcassShell(prepared: PreparedCarcassInput): CarcassShellResult {
  const {
    totalW,
    D,
    H,
    woodThick,
    startY,
    cabinetBodyHeight,
    moduleWidths,
    moduleHeightsRaw,
    moduleDepths,
    isStepped,
    isDepthStepped,
  } = prepared;

  const floorCeilDepth = Math.max(
    SHELL_DIMENSIONS.boardMinDepthM,
    D - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z)
  );
  const floorCeilZ = (CARCASS_BACK_INSET_Z - CARCASS_FRONT_INSET_Z) / 2;

  const boards: CarcassBoardOp[] = [];
  if (
    isDepthStepped &&
    moduleWidths &&
    moduleDepths &&
    moduleWidths.length === moduleDepths.length &&
    moduleWidths.length > 0
  ) {
    appendDepthSteppedFloorBoards({ totalW, D, woodThick, startY, moduleWidths, moduleDepths, boards });
  } else {
    boards.push({
      kind: 'board',
      role: 'floor',
      partId: 'body_floor',
      width: totalW - 2 * woodThick - SHELL_DIMENSIONS.floorCeilWidthClearanceM,
      height: woodThick,
      depth: floorCeilDepth,
      x: 0,
      y: startY + woodThick / 2,
      z: floorCeilZ,
    });
  }

  const backPanel: CarcassBackPanelOp = {
    kind: 'back_panel',
    width: totalW - SHELL_DIMENSIONS.backPanelWidthClearanceM,
    height: cabinetBodyHeight,
    depth: SHELL_DIMENSIONS.backPanelThicknessM,
    x: 0,
    y: startY + cabinetBodyHeight / 2,
    z: -D / 2 + SHELL_DIMENSIONS.backPanelZM,
  };

  let backPanels: CarcassBackPanelOp[] | null = null;

  if (isStepped && moduleWidths && moduleHeightsRaw) {
    backPanels = [];
    appendSteppedShell({
      totalW,
      D,
      H,
      woodThick,
      startY,
      cabinetBodyHeight,
      moduleWidths,
      moduleHeightsRaw,
      moduleDepths,
      isDepthStepped,
      removedLeftFrameSide: prepared.removedLeftFrameSide,
      removedRightFrameSide: prepared.removedRightFrameSide,
      boards,
      backPanels,
    });
    applyRemovedFrameSideBackPanelIdentity(prepared, backPanels);
  } else if (
    isDepthStepped &&
    moduleWidths &&
    moduleDepths &&
    moduleWidths.length === moduleDepths.length &&
    moduleWidths.length > 0
  ) {
    appendDepthSteppedSidesAndCeil({
      totalW,
      D,
      woodThick,
      startY,
      cabinetBodyHeight,
      moduleWidths,
      moduleDepths,
      boards,
    });
  } else {
    boards.push(
      {
        kind: 'board',
        role: 'ceiling',
        partId: 'body_ceil',
        width: totalW - 2 * woodThick - SHELL_DIMENSIONS.floorCeilWidthClearanceM,
        height: woodThick,
        depth: floorCeilDepth,
        x: 0,
        y: startY + cabinetBodyHeight - woodThick / 2,
        z: floorCeilZ,
      },
      {
        kind: 'board',
        role: 'left-side',
        partId: 'body_left',
        width: woodThick,
        height: cabinetBodyHeight,
        depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, D - SHELL_DIMENSIONS.sideDepthClearanceM),
        x: -totalW / 2 + woodThick / 2,
        y: startY + cabinetBodyHeight / 2,
        z: SHELL_DIMENSIONS.sideZOffsetM,
      },
      {
        kind: 'board',
        role: 'right-side',
        partId: 'body_right',
        width: woodThick,
        height: cabinetBodyHeight,
        depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, D - SHELL_DIMENSIONS.sideDepthClearanceM),
        x: totalW / 2 - woodThick / 2,
        y: startY + cabinetBodyHeight / 2,
        z: SHELL_DIMENSIONS.sideZOffsetM,
      }
    );
  }

  if (!backPanels && hasRemovedFrameSide(prepared)) {
    backPanels = buildRemovedFrameSideBackPanelSegments(prepared, backPanel);
  }

  return { boards, backPanel, backPanels };
}

function hasRemovedFrameSide(prepared: PreparedCarcassInput): boolean {
  return prepared.removedLeftFrameSide || prepared.removedRightFrameSide;
}

function readRemovedBackPanelPartId(
  prepared: PreparedCarcassInput,
  moduleIndex: number,
  modulesLength: number
): string | null {
  const left = prepared.removedLeftFrameSide && moduleIndex === 0;
  const right = prepared.removedRightFrameSide && moduleIndex === modulesLength - 1;
  if (left && right) return 'body_back_open';
  if (left) return 'body_back_left_open';
  if (right) return 'body_back_right_open';
  return null;
}

type BackPanelSegmentBounds = {
  leftBoundary: number;
  rightBoundary: number;
};

type BackPanelSegmentInput = Pick<
  PreparedCarcassInput,
  'totalW' | 'woodThick' | 'removedLeftFrameSide' | 'removedRightFrameSide'
>;

function resolveBackPanelSegmentBounds(args: {
  prepared: BackPanelSegmentInput;
  moduleIndex: number;
  modulesLength: number;
  internalLeft: number;
  moduleWidth: number;
}): BackPanelSegmentBounds {
  const { prepared, moduleIndex, modulesLength, internalLeft, moduleWidth } = args;
  const { totalW, woodThick } = prepared;
  let leftBoundary = moduleIndex === 0 ? -totalW / 2 : internalLeft;
  let rightBoundary = moduleIndex === modulesLength - 1 ? totalW / 2 : internalLeft + moduleWidth + woodThick;

  if (prepared.removedLeftFrameSide && moduleIndex === 0) {
    leftBoundary += woodThick;
  }
  if (prepared.removedRightFrameSide && moduleIndex === modulesLength - 1) {
    rightBoundary -= woodThick;
  }

  return { leftBoundary, rightBoundary };
}

function resolveBackPanelSegmentGeometry(
  bounds: BackPanelSegmentBounds
): Pick<CarcassBackPanelOp, 'width' | 'x'> {
  const rawWidth = bounds.rightBoundary - bounds.leftBoundary;
  return {
    width: Math.max(
      SHELL_DIMENSIONS.boardMinDimensionM,
      rawWidth - SHELL_DIMENSIONS.backPanelSegmentWidthClearanceM
    ),
    x: (bounds.leftBoundary + bounds.rightBoundary) / 2,
  };
}

function markBackPanelAsWood(seg: CarcassBackPanelOp, partId: string): CarcassBackPanelOp {
  return {
    ...seg,
    partId,
    material: 'wood',
    __wpWoodBackPanel: true,
  };
}

function applyRemovedFrameSideBackPanelIdentity(
  prepared: PreparedCarcassInput,
  backPanels: CarcassBackPanelOp[]
): void {
  if (!hasRemovedFrameSide(prepared)) return;
  const modulesLength = backPanels.length;
  if (!(modulesLength > 0)) return;
  for (let i = 0; i < modulesLength; i += 1) {
    const partId = readRemovedBackPanelPartId(prepared, i, modulesLength);
    if (partId) backPanels[i] = markBackPanelAsWood(backPanels[i], partId);
  }
}

function buildRemovedFrameSideBackPanelSegments(
  prepared: PreparedCarcassInput,
  fallbackBackPanel: CarcassBackPanelOp
): CarcassBackPanelOp[] {
  const { totalW, woodThick, moduleWidths } = prepared;
  if (!moduleWidths || !moduleWidths.length) {
    const partId = readRemovedBackPanelPartId(prepared, 0, 1);
    const bounds = resolveBackPanelSegmentBounds({
      prepared,
      moduleIndex: 0,
      modulesLength: 1,
      internalLeft: -prepared.totalW / 2 + prepared.woodThick,
      moduleWidth: Math.max(0, prepared.totalW - 2 * prepared.woodThick),
    });
    const single: CarcassBackPanelOp = {
      ...fallbackBackPanel,
      ...resolveBackPanelSegmentGeometry(bounds),
    };
    return [partId ? markBackPanelAsWood(single, partId) : single];
  }

  const backPanels: CarcassBackPanelOp[] = [];
  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i += 1) {
    const width = moduleWidths[i];
    const bounds = resolveBackPanelSegmentBounds({
      prepared,
      moduleIndex: i,
      modulesLength: moduleWidths.length,
      internalLeft,
      moduleWidth: width,
    });
    const baseSegment: CarcassBackPanelOp = {
      ...fallbackBackPanel,
      ...resolveBackPanelSegmentGeometry(bounds),
    };
    const partId = readRemovedBackPanelPartId(prepared, i, moduleWidths.length);
    backPanels.push(partId ? markBackPanelAsWood(baseSegment, partId) : baseSegment);
    internalLeft += width + (i < moduleWidths.length - 1 ? woodThick : 0);
  }
  return backPanels;
}

type DepthSteppedFloorParams = {
  totalW: number;
  D: number;
  woodThick: number;
  startY: number;
  moduleWidths: number[];
  moduleDepths: number[];
  boards: CarcassBoardOp[];
};

function appendDepthSteppedFloorBoards(params: DepthSteppedFloorParams): void {
  const { totalW, D, woodThick, startY, moduleWidths, moduleDepths, boards } = params;
  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const dm = moduleDepths[i];
    const floorLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const floorRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const floorW = Math.max(
      SHELL_DIMENSIONS.boardMinDimensionM,
      floorRight - floorLeft - SHELL_DIMENSIONS.floorCeilWidthClearanceM
    );
    const floorDepth = Math.max(
      SHELL_DIMENSIONS.boardMinDepthM,
      dm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z)
    );
    const floorZ = -D / 2 + CARCASS_BACK_INSET_Z + floorDepth / 2;

    boards.push({
      kind: 'board',
      role: 'floor',
      partId: 'body_floor',
      width: floorW,
      height: woodThick,
      depth: floorDepth,
      x: (floorLeft + floorRight) / 2,
      y: startY + woodThick / 2,
      z: floorZ,
    });

    internalLeft += w + (i < moduleWidths.length - 1 ? woodThick : 0);
  }
}

type SteppedShellParams = {
  totalW: number;
  D: number;
  H: number;
  woodThick: number;
  startY: number;
  cabinetBodyHeight: number;
  moduleWidths: number[];
  moduleHeightsRaw: unknown[];
  moduleDepths: number[] | null;
  isDepthStepped: boolean;
  removedLeftFrameSide: boolean;
  removedRightFrameSide: boolean;
  boards: CarcassBoardOp[];
  backPanels: CarcassBackPanelOp[];
};

function appendSteppedShell(params: SteppedShellParams): void {
  const {
    totalW,
    D,
    H,
    woodThick,
    startY,
    cabinetBodyHeight,
    moduleWidths,
    moduleHeightsRaw,
    moduleDepths,
    isDepthStepped,
    removedLeftFrameSide,
    removedRightFrameSide,
    boards,
    backPanels,
  } = params;

  const bodyHeights = moduleHeightsRaw.map(v =>
    Math.min(cabinetBodyHeight, Math.max(woodThick * 2, __asNum(v, H) - startY))
  );

  const leftDepth = isDepthStepped && moduleDepths ? moduleDepths[0] : D;
  const rightDepth = isDepthStepped && moduleDepths ? moduleDepths[moduleDepths.length - 1] : D;
  const leftZ = isDepthStepped && moduleDepths ? -D / 2 + leftDepth / 2 : 0;
  const rightZ = isDepthStepped && moduleDepths ? -D / 2 + rightDepth / 2 : 0;

  boards.push({
    kind: 'board',
    role: 'left-side',
    partId: 'body_left',
    width: woodThick,
    height: bodyHeights[0],
    depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, leftDepth - SHELL_DIMENSIONS.sideDepthClearanceM),
    x: -totalW / 2 + woodThick / 2,
    y: startY + bodyHeights[0] / 2,
    z: leftZ + SHELL_DIMENSIONS.sideZOffsetM,
  });

  boards.push({
    kind: 'board',
    role: 'right-side',
    partId: 'body_right',
    width: woodThick,
    height: bodyHeights[bodyHeights.length - 1],
    depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, rightDepth - SHELL_DIMENSIONS.sideDepthClearanceM),
    x: totalW / 2 - woodThick / 2,
    y: startY + bodyHeights[bodyHeights.length - 1] / 2,
    z: rightZ + SHELL_DIMENSIONS.sideZOffsetM,
  });

  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const h = bodyHeights[i];
    const ceilLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const ceilRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const ceilW = Math.max(
      SHELL_DIMENSIONS.boardMinDimensionM,
      ceilRight - ceilLeft - SHELL_DIMENSIONS.floorCeilWidthClearanceM
    );
    const ceilDm = isDepthStepped && moduleDepths ? moduleDepths[i] : D;
    const ceilDepth = Math.max(
      SHELL_DIMENSIONS.boardMinDepthM,
      ceilDm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z)
    );
    const ceilZ = -D / 2 + CARCASS_BACK_INSET_Z + ceilDepth / 2;

    boards.push({
      kind: 'board',
      role: 'ceiling',
      partId: 'body_ceil',
      width: ceilW,
      height: woodThick,
      depth: ceilDepth,
      x: (ceilLeft + ceilRight) / 2,
      y: startY + h - woodThick / 2,
      z: ceilZ,
    });

    const bounds = resolveBackPanelSegmentBounds({
      prepared: { totalW, woodThick, removedLeftFrameSide, removedRightFrameSide },
      moduleIndex: i,
      modulesLength: moduleWidths.length,
      internalLeft,
      moduleWidth: w,
    });
    const seg: CarcassBackPanelOp = {
      kind: 'back_panel',
      ...resolveBackPanelSegmentGeometry(bounds),
      height: Math.max(SHELL_DIMENSIONS.boardMinDimensionM, h),
      depth: SHELL_DIMENSIONS.backPanelThicknessM,
      y: startY + h / 2,
      z: -D / 2 + SHELL_DIMENSIONS.backPanelZM,
    };

    backPanels.push(seg);

    internalLeft += w + (i < moduleWidths.length - 1 ? woodThick : 0);
  }
}

type DepthSteppedShellParams = {
  totalW: number;
  D: number;
  woodThick: number;
  startY: number;
  cabinetBodyHeight: number;
  moduleWidths: number[];
  moduleDepths: number[];
  boards: CarcassBoardOp[];
};

function appendDepthSteppedSidesAndCeil(params: DepthSteppedShellParams): void {
  const { totalW, D, woodThick, startY, cabinetBodyHeight, moduleWidths, moduleDepths, boards } = params;
  const leftDepth = moduleDepths[0];
  const rightDepth = moduleDepths[moduleDepths.length - 1];
  const leftZ = -D / 2 + leftDepth / 2;
  const rightZ = -D / 2 + rightDepth / 2;

  boards.push(
    {
      kind: 'board',
      role: 'left-side',
      partId: 'body_left',
      width: woodThick,
      height: cabinetBodyHeight,
      depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, leftDepth - SHELL_DIMENSIONS.sideDepthClearanceM),
      x: -totalW / 2 + woodThick / 2,
      y: startY + cabinetBodyHeight / 2,
      z: leftZ + SHELL_DIMENSIONS.sideZOffsetM,
    },
    {
      kind: 'board',
      role: 'right-side',
      partId: 'body_right',
      width: woodThick,
      height: cabinetBodyHeight,
      depth: Math.max(SHELL_DIMENSIONS.bodyMinDepthM, rightDepth - SHELL_DIMENSIONS.sideDepthClearanceM),
      x: totalW / 2 - woodThick / 2,
      y: startY + cabinetBodyHeight / 2,
      z: rightZ + SHELL_DIMENSIONS.sideZOffsetM,
    }
  );

  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const dm = moduleDepths[i];
    const ceilLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const ceilRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const ceilW = Math.max(
      SHELL_DIMENSIONS.boardMinDimensionM,
      ceilRight - ceilLeft - SHELL_DIMENSIONS.floorCeilWidthClearanceM
    );
    const ceilDepth = Math.max(
      SHELL_DIMENSIONS.boardMinDepthM,
      dm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z)
    );
    const ceilZ = -D / 2 + CARCASS_BACK_INSET_Z + ceilDepth / 2;

    boards.push({
      kind: 'board',
      role: 'ceiling',
      partId: 'body_ceil',
      width: ceilW,
      height: woodThick,
      depth: ceilDepth,
      x: (ceilLeft + ceilRight) / 2,
      y: startY + cabinetBodyHeight - woodThick / 2,
      z: ceilZ,
    });

    internalLeft += w + (i < moduleWidths.length - 1 ? woodThick : 0);
  }
}
