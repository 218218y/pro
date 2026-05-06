// Corner connector special interior folded-content planning.
//
// This owner plans and emits folded-clothes surfaces. It deliberately does not
// create connector geometry or mutate shelf meshes.

import { CORNER_CONNECTOR_INTERIOR_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CornerConnectorInteriorEmitters,
  CornerConnectorInteriorFlowParams,
} from './corner_connector_interior_shared.js';
import type { FoldedClothesSurfacePlan } from './corner_connector_interior_special_types.js';

const FOLDED_CONTENTS_DIMENSIONS = CORNER_CONNECTOR_INTERIOR_DIMENSIONS.foldedContents;

function emitFoldedClothesPlan(
  plan: FoldedClothesSurfacePlan,
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown
): void {
  if (!emitFoldedClothes) return;
  try {
    emitFoldedClothes(plan.x, plan.y, plan.z, plan.width, parentGroup, plan.maxHeight, plan.maxDepth);
  } catch (error) {
    reportErrorThrottled(App, error, { where: 'corner_ops_emit', op: plan.op, throttleMs: 4000 });
  }
}

export function emitFoldedClothesPlans(
  plans: readonly FoldedClothesSurfacePlan[],
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown
): void {
  for (const plan of plans) {
    emitFoldedClothesPlan(plan, parentGroup, emitFoldedClothes, reportErrorThrottled, App);
  }
}

export function createLeftShelvesContentsPlan(args: {
  postX: number;
  wallX: number;
  depth: number;
  backInset: number;
  floorTopY: number;
  shelf1BottomY: number;
  woodThick: number;
  leftShelfBottomYs: readonly number[];
}): FoldedClothesSurfacePlan[] {
  const { postX, wallX, depth, backInset, floorTopY, shelf1BottomY, woodThick, leftShelfBottomYs } = args;
  const width = Math.abs(postX - wallX);
  const usableDepth = Math.max(0, depth - backInset);
  if (
    !(width > FOLDED_CONTENTS_DIMENSIONS.leftWidthMinM) ||
    !(usableDepth > FOLDED_CONTENTS_DIMENSIONS.leftDepthMinM)
  )
    return [];

  const centerX = (postX + wallX) / 2;
  const centerZ = backInset + usableDepth / 2;
  const shelfBottomYs = leftShelfBottomYs.slice().sort((a, b) => a - b);
  const plans: FoldedClothesSurfacePlan[] = [];

  const firstStop = shelfBottomYs.length ? shelfBottomYs[0] : shelf1BottomY;
  const floorMaxHeight = firstStop - floorTopY - FOLDED_CONTENTS_DIMENSIONS.surfaceHeightClearanceM;
  if (floorMaxHeight > FOLDED_CONTENTS_DIMENSIONS.surfaceMinHeightM) {
    plans.push({
      x: centerX,
      y: floorTopY + FOLDED_CONTENTS_DIMENSIONS.surfaceYOffsetM,
      z: centerZ,
      width: Math.max(
        FOLDED_CONTENTS_DIMENSIONS.widthMinM,
        width - FOLDED_CONTENTS_DIMENSIONS.widthClearanceM
      ),
      maxHeight: Math.max(
        FOLDED_CONTENTS_DIMENSIONS.maxHeightMinM,
        Math.min(FOLDED_CONTENTS_DIMENSIONS.maxHeightMaxM, floorMaxHeight)
      ),
      maxDepth: usableDepth,
      op: 'special:leftSurface:floor',
    });
  }

  for (let i = 0; i < shelfBottomYs.length; i++) {
    const topY = shelfBottomYs[i] + woodThick;
    const nextStop = i + 1 < shelfBottomYs.length ? shelfBottomYs[i + 1] : shelf1BottomY;
    const maxHeight = nextStop - topY - FOLDED_CONTENTS_DIMENSIONS.surfaceHeightClearanceM;
    if (maxHeight > FOLDED_CONTENTS_DIMENSIONS.surfaceMinHeightM) {
      plans.push({
        x: centerX,
        y: topY + FOLDED_CONTENTS_DIMENSIONS.surfaceYOffsetM,
        z: centerZ,
        width: Math.max(
          FOLDED_CONTENTS_DIMENSIONS.widthMinM,
          width - FOLDED_CONTENTS_DIMENSIONS.widthClearanceM
        ),
        maxHeight: Math.max(
          FOLDED_CONTENTS_DIMENSIONS.maxHeightMinM,
          Math.min(FOLDED_CONTENTS_DIMENSIONS.maxHeightMaxM, maxHeight)
        ),
        maxDepth: usableDepth,
        op: `special:leftSurface:shelf:${i + 1}`,
      });
    }
  }

  return plans;
}

export function createPentagonTopContentsPlan(args: {
  mx: (x: number) => number;
  L: number;
  shelf1Added: boolean;
  shelf1BottomY: number;
  shelf2Added: boolean;
  shelf2BottomY: number;
  woodThick: number;
  ceilBottomY: number;
}): FoldedClothesSurfacePlan[] {
  const { mx, L, shelf1Added, shelf1BottomY, shelf2Added, shelf2BottomY, woodThick, ceilBottomY } = args;
  const safeX = mx(-L / 2);
  const safeZ = Math.max(
    FOLDED_CONTENTS_DIMENSIONS.pentagonSafeZMinM,
    Math.min(
      L * FOLDED_CONTENTS_DIMENSIONS.pentagonSafeZRatio,
      L - FOLDED_CONTENTS_DIMENSIONS.pentagonSafeZEndClearanceM
    )
  );
  const safeW = Math.max(
    FOLDED_CONTENTS_DIMENSIONS.pentagonSafeWidthMinM,
    Math.min(
      L * FOLDED_CONTENTS_DIMENSIONS.pentagonSafeWidthRatio,
      FOLDED_CONTENTS_DIMENSIONS.pentagonSafeWidthMaxM
    )
  );
  const safeD = Math.max(
    FOLDED_CONTENTS_DIMENSIONS.pentagonSafeDepthMinM,
    Math.min(
      FOLDED_CONTENTS_DIMENSIONS.pentagonSafeDepthMaxM,
      L - FOLDED_CONTENTS_DIMENSIONS.pentagonSafeDepthEndClearanceM
    )
  );
  const plans: FoldedClothesSurfacePlan[] = [];

  if (shelf1Added) {
    const surfaceY = shelf1BottomY + woodThick + FOLDED_CONTENTS_DIMENSIONS.surfaceYOffsetM;
    const stopY = shelf2Added ? shelf2BottomY : ceilBottomY;
    const maxHeight = stopY - surfaceY - FOLDED_CONTENTS_DIMENSIONS.surfaceHeightClearanceM;
    if (maxHeight > FOLDED_CONTENTS_DIMENSIONS.surfaceMinHeightM) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(FOLDED_CONTENTS_DIMENSIONS.maxHeightMaxM, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:lower',
      });
    }
  }

  if (shelf2Added) {
    const surfaceY = shelf2BottomY + woodThick + FOLDED_CONTENTS_DIMENSIONS.surfaceYOffsetM;
    const maxHeight = ceilBottomY - surfaceY - FOLDED_CONTENTS_DIMENSIONS.surfaceHeightClearanceM;
    if (maxHeight > FOLDED_CONTENTS_DIMENSIONS.surfaceMinHeightM) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(FOLDED_CONTENTS_DIMENSIONS.maxHeightMaxM, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:upper',
      });
    }
  }

  return plans;
}
