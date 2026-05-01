// Corner connector special interior metric policy.
//
// This owner keeps user-input normalization, post/shelf height clamping, and
// equal-shelf placement out of the scene-emission code.

import type { CornerConnectorInteriorFlowParams } from './corner_connector_interior_shared.js';
import type { CornerConnectorSpecialMetrics } from './corner_connector_interior_special_types.js';

function readCentimetersAsMeters(raw: unknown, fallbackMeters: number): number {
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed / 100 : fallbackMeters;
}

export function resolveCornerConnectorSpecialMetrics(args: {
  uiAny: CornerConnectorInteriorFlowParams['ctx']['uiAny'];
  mx: CornerConnectorInteriorFlowParams['locals']['mx'];
  L: number;
  Dmain: number;
  woodThick: number;
  startY: number;
  wingH: number;
  panelThick: number;
  backPanelThick: number;
  backPanelOutsideInsetZ: number;
}): CornerConnectorSpecialMetrics | null {
  const {
    uiAny,
    mx,
    L,
    Dmain,
    woodThick,
    startY,
    wingH,
    panelThick,
    backPanelThick,
    backPanelOutsideInsetZ,
  } = args;

  const postDepthCmRaw = uiAny.cornerPentSpecialPostDepthCm ?? uiAny.cornerPentPostDepthCm ?? 55;
  const postHeightCmRaw = uiAny.cornerPentSpecialPostHeightCm ?? uiAny.cornerPentPostHeightCm ?? 180;
  const topCellHCmRaw = uiAny.cornerPentSpecialTopCellHeightCm ?? uiAny.cornerPentTopCellHeightCm ?? 30;
  const postOffsetFromWallCmRaw =
    uiAny.cornerPentSpecialPostOffsetFromWallCm ?? uiAny.cornerPentPostOffsetFromWallCm;

  const postDepth = readCentimetersAsMeters(postDepthCmRaw, 0.55);
  const postH = readCentimetersAsMeters(postHeightCmRaw, 1.8);
  const cellH = readCentimetersAsMeters(topCellHCmRaw, 0.3);

  const depth = Math.max(0.05, Math.min(Dmain, postDepth));
  const backInset = Math.max(
    0,
    Math.min(Math.min(L, depth) - 0.02, backPanelThick + backPanelOutsideInsetZ + 0.0006)
  );
  const sideInset = Math.max(0, panelThick + 0.0006);

  const floorTopY = startY + woodThick;
  const ceilBottomY = startY + wingH - woodThick;
  const availH = Math.max(0, ceilBottomY - floorTopY);
  if (availH < 0.35) return null;

  const postHClamped = Math.max(0.2, Math.min(postH, Math.max(0.2, availH - 2 * (cellH + woodThick))));
  const needH = postHClamped + 2 * (cellH + woodThick);
  const shelf1BottomY = floorTopY + postHClamped;
  const shelf2BottomY = shelf1BottomY + woodThick + cellH;

  const wallX = mx(-L);
  let postX = wallX / 2;

  if (typeof postOffsetFromWallCmRaw !== 'undefined') {
    const off = readCentimetersAsMeters(postOffsetFromWallCmRaw, Number.NaN);
    if (Number.isFinite(off)) {
      const t = Math.max(0.05, Math.min(0.95, off / Math.max(0.001, L)));
      postX = wallX + (0 - wallX) * t;
    }
  }

  const minX = Math.min(wallX, 0);
  const maxX = Math.max(wallX, 0);
  postX = Math.max(minX + 0.03, Math.min(maxX - 0.03, postX));

  return {
    depth,
    backInset,
    sideInset,
    floorTopY,
    ceilBottomY,
    availH,
    postHClamped,
    needH,
    shelf1BottomY,
    shelf2BottomY,
    wallX,
    postX,
  };
}

export function createEqualShelfBottomYs(args: {
  enabled: boolean;
  floorTopY: number;
  targetTop: number;
  woodThick: number;
}): number[] {
  const { enabled, floorTopY, targetTop, woodThick } = args;
  if (!enabled) return [];
  const spanH = Math.max(0, targetTop - floorTopY);
  if (spanH < 0.35) return [];

  const net = spanH - 3 * woodThick;
  if (net <= 0.12) return [];
  const space = net / 4;
  const bottoms: number[] = [];

  for (let i = 1; i <= 3; i++) {
    const by = floorTopY + i * space + (i - 1) * woodThick;
    if (by + woodThick <= targetTop - 0.002) bottoms.push(by);
  }
  return bottoms;
}
