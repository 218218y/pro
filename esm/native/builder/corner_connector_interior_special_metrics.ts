// Corner connector special interior metric policy.
//
// This owner keeps user-input normalization, post/shelf height clamping, and
// equal-shelf placement out of the scene-emission code.

import {
  CM_PER_METER,
  CORNER_CONNECTOR_INTERIOR_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerConnectorInteriorFlowParams } from './corner_connector_interior_shared.js';
import type { CornerConnectorSpecialMetrics } from './corner_connector_interior_special_types.js';

function readCentimetersAsMeters(raw: unknown, defaultMeters: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw / CM_PER_METER : defaultMeters;
}

export function resolveCornerConnectorSpecialMetrics(args: {
  uiAny: CornerConnectorInteriorFlowParams['ctx']['uiAny'];
  mx: CornerConnectorInteriorFlowParams['locals']['mx'];
  L: number;
  Dmain: number;
  woodThick: number;
  shelfThick: number;
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
    shelfThick,
    startY,
    wingH,
    panelThick,
    backPanelThick,
    backPanelOutsideInsetZ,
  } = args;

  const postDepthCmRaw =
    uiAny.cornerPentSpecialPostDepthCm ??
    uiAny.cornerPentPostDepthCm ??
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.depthDefaultCm;
  const postHeightCmRaw =
    uiAny.cornerPentSpecialPostHeightCm ??
    uiAny.cornerPentPostHeightCm ??
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.heightDefaultCm;
  const topCellHCmRaw =
    uiAny.cornerPentSpecialTopCellHeightCm ??
    uiAny.cornerPentTopCellHeightCm ??
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.topCellHeightDefaultCm;
  const postOffsetFromWallCmRaw =
    uiAny.cornerPentSpecialPostOffsetFromWallCm ?? uiAny.cornerPentPostOffsetFromWallCm;

  const postDepth = readCentimetersAsMeters(
    postDepthCmRaw,
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.depthDefaultCm / CM_PER_METER
  );
  const postH = readCentimetersAsMeters(
    postHeightCmRaw,
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.heightDefaultCm / CM_PER_METER
  );
  const cellH = readCentimetersAsMeters(
    topCellHCmRaw,
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.topCellHeightDefaultCm / CM_PER_METER
  );

  const depth = Math.max(
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.depthMinM,
    Math.min(Dmain, postDepth)
  );
  const backInset = Math.max(
    0,
    Math.min(
      Math.min(L, depth) - CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postInsetClearanceM,
      backPanelThick +
        backPanelOutsideInsetZ +
        CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.panelGapEpsilonM
    )
  );
  const sideInset = Math.max(
    0,
    panelThick + CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.panelGapEpsilonM
  );

  const floorTopY = startY + woodThick;
  const ceilBottomY = startY + wingH - woodThick;
  const availH = Math.max(0, ceilBottomY - floorTopY);
  if (availH < CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.minAvailableHeightM) return null;

  const postHClamped = Math.max(
    CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postHeightMinM,
    Math.min(
      postH,
      Math.max(
        CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postHeightMinM,
        availH - 2 * (cellH + shelfThick)
      )
    )
  );
  const needH = postHClamped + 2 * (cellH + shelfThick);
  const shelf1BottomY = floorTopY + postHClamped;
  const shelf2BottomY = shelf1BottomY + shelfThick + cellH;

  const wallX = mx(-L);
  let postX = wallX / 2;

  if (typeof postOffsetFromWallCmRaw !== 'undefined') {
    const off = readCentimetersAsMeters(postOffsetFromWallCmRaw, Number.NaN);
    if (Number.isFinite(off)) {
      const t = Math.max(
        CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postOffsetNormMin,
        Math.min(
          CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postOffsetNormMax,
          off / Math.max(CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.panelGapEpsilonM, L)
        )
      );
      postX = wallX + (0 - wallX) * t;
    }
  }

  const minX = Math.min(wallX, 0);
  const maxX = Math.max(wallX, 0);
  postX = Math.max(
    minX + CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postClampEdgeInsetM,
    Math.min(maxX - CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.postClampEdgeInsetM, postX)
  );

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
  shelfThick: number;
}): number[] {
  const { enabled, floorTopY, targetTop, shelfThick } = args;
  if (!enabled) return [];
  const spanH = Math.max(0, targetTop - floorTopY);
  if (spanH < CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.shelfSpanMinM) return [];

  const net = spanH - 3 * shelfThick;
  if (net <= CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.shelfNetMinM) return [];
  const space = net / 4;
  const bottoms: number[] = [];

  for (let i = 1; i <= 3; i++) {
    const by = floorTopY + i * space + (i - 1) * shelfThick;
    if (by + shelfThick <= targetTop - CORNER_CONNECTOR_INTERIOR_DIMENSIONS.specialPost.shelfTopClearanceM)
      bottoms.push(by);
  }
  return bottoms;
}
