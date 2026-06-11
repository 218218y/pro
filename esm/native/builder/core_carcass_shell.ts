// Builder core carcass shell board and back-panel assembly.

import { __asNum } from './core_pure_shared.js';
import type { MutableRecord } from './core_pure_shared.js';
import {
  CARCASS_BACK_INSET_Z,
  CARCASS_FRONT_INSET_Z,
  type PreparedCarcassInput,
} from './core_carcass_shared.js';

export type CarcassShellResult = {
  boards: MutableRecord[];
  backPanel: MutableRecord;
  backPanels: MutableRecord[] | null;
};

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

  const floorCeilDepth = Math.max(0.02, D - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z));
  const floorCeilZ = (CARCASS_BACK_INSET_Z - CARCASS_FRONT_INSET_Z) / 2;

  const boards: MutableRecord[] = [];
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
      partId: 'body_floor',
      width: totalW - 2 * woodThick - 0.001,
      height: woodThick,
      depth: floorCeilDepth,
      x: 0,
      y: startY + woodThick / 2,
      z: floorCeilZ,
    });
  }

  const backPanel: MutableRecord = {
    kind: 'back_panel',
    width: totalW - 0.002,
    height: cabinetBodyHeight,
    depth: 0.005,
    x: 0,
    y: startY + cabinetBodyHeight / 2,
    z: -D / 2 + 0.005,
  };

  let backPanels: MutableRecord[] | null = null;

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
      boards,
      backPanels,
    });
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
        partId: 'body_ceil',
        width: totalW - 2 * woodThick - 0.001,
        height: woodThick,
        depth: floorCeilDepth,
        x: 0,
        y: startY + cabinetBodyHeight - woodThick / 2,
        z: floorCeilZ,
      },
      {
        kind: 'board',
        partId: 'body_left',
        width: woodThick,
        height: cabinetBodyHeight,
        depth: Math.max(0.05, D - 0.0078),
        x: -totalW / 2 + woodThick / 2,
        y: startY + cabinetBodyHeight / 2,
        z: 0.0039,
      },
      {
        kind: 'board',
        partId: 'body_right',
        width: woodThick,
        height: cabinetBodyHeight,
        depth: Math.max(0.05, D - 0.0078),
        x: totalW / 2 - woodThick / 2,
        y: startY + cabinetBodyHeight / 2,
        z: 0.0039,
      }
    );
  }

  return { boards, backPanel, backPanels };
}

type DepthSteppedFloorParams = {
  totalW: number;
  D: number;
  woodThick: number;
  startY: number;
  moduleWidths: number[];
  moduleDepths: number[];
  boards: MutableRecord[];
};

function appendDepthSteppedFloorBoards(params: DepthSteppedFloorParams): void {
  const { totalW, D, woodThick, startY, moduleWidths, moduleDepths, boards } = params;
  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const dm = moduleDepths[i];
    const floorLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const floorRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const floorW = Math.max(0.001, floorRight - floorLeft - 0.001);
    const floorDepth = Math.max(0.02, dm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z));
    const floorZ = -D / 2 + CARCASS_BACK_INSET_Z + floorDepth / 2;

    boards.push({
      kind: 'board',
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
  boards: MutableRecord[];
  backPanels: MutableRecord[];
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
    partId: 'body_left',
    width: woodThick,
    height: bodyHeights[0],
    depth: Math.max(0.05, leftDepth - 0.0078),
    x: -totalW / 2 + woodThick / 2,
    y: startY + bodyHeights[0] / 2,
    z: leftZ + 0.0039,
  });

  boards.push({
    kind: 'board',
    partId: 'body_right',
    width: woodThick,
    height: bodyHeights[bodyHeights.length - 1],
    depth: Math.max(0.05, rightDepth - 0.0078),
    x: totalW / 2 - woodThick / 2,
    y: startY + bodyHeights[bodyHeights.length - 1] / 2,
    z: rightZ + 0.0039,
  });

  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const h = bodyHeights[i];
    const ceilLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const ceilRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const ceilW = Math.max(0.001, ceilRight - ceilLeft - 0.001);
    const ceilDm = isDepthStepped && moduleDepths ? moduleDepths[i] : D;
    const ceilDepth = Math.max(0.02, ceilDm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z));
    const ceilZ = -D / 2 + CARCASS_BACK_INSET_Z + ceilDepth / 2;

    boards.push({
      kind: 'board',
      partId: 'body_ceil',
      width: ceilW,
      height: woodThick,
      depth: ceilDepth,
      x: (ceilLeft + ceilRight) / 2,
      y: startY + h - woodThick / 2,
      z: ceilZ,
    });

    const leftBoundary = i === 0 ? -totalW / 2 : internalLeft;
    const rightBoundary = i === moduleWidths.length - 1 ? totalW / 2 : internalLeft + w + woodThick;
    const segW = Math.max(0.001, rightBoundary - leftBoundary - 0.002);

    backPanels.push({
      kind: 'back_panel',
      width: segW,
      height: Math.max(0.001, h),
      depth: 0.005,
      x: (leftBoundary + rightBoundary) / 2,
      y: startY + h / 2,
      z: -D / 2 + 0.005,
    });

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
  boards: MutableRecord[];
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
      partId: 'body_left',
      width: woodThick,
      height: cabinetBodyHeight,
      depth: Math.max(0.05, leftDepth - 0.0078),
      x: -totalW / 2 + woodThick / 2,
      y: startY + cabinetBodyHeight / 2,
      z: leftZ + 0.0039,
    },
    {
      kind: 'board',
      partId: 'body_right',
      width: woodThick,
      height: cabinetBodyHeight,
      depth: Math.max(0.05, rightDepth - 0.0078),
      x: totalW / 2 - woodThick / 2,
      y: startY + cabinetBodyHeight / 2,
      z: rightZ + 0.0039,
    }
  );

  let internalLeft = -totalW / 2 + woodThick;
  for (let i = 0; i < moduleWidths.length; i++) {
    const w = moduleWidths[i];
    const dm = moduleDepths[i];
    const ceilLeft = i === 0 ? -totalW / 2 + woodThick : internalLeft;
    const ceilRight = i === moduleWidths.length - 1 ? totalW / 2 - woodThick : internalLeft + w + woodThick;
    const ceilW = Math.max(0.001, ceilRight - ceilLeft - 0.001);
    const ceilDepth = Math.max(0.02, dm - (CARCASS_BACK_INSET_Z + CARCASS_FRONT_INSET_Z));
    const ceilZ = -D / 2 + CARCASS_BACK_INSET_Z + ceilDepth / 2;

    boards.push({
      kind: 'board',
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
