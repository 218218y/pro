// Corner connector special interior folded-content planning.
//
// This owner plans and emits folded-clothes surfaces. It deliberately does not
// create connector geometry or mutate shelf meshes.

import { CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY } from '../../shared/dimensions/corner_connector_interior_policy.js';
import type {
  CornerConnectorInteriorEmitters,
  CornerConnectorInteriorFlowParams,
} from './corner_connector_interior_shared.js';
import type { FoldedClothesSurfacePlan } from './corner_connector_interior_special_types.js';

function emitFoldedClothesPlan(
  plan: FoldedClothesSurfacePlan,
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown,
  policy: {
    showContentsEnabled: boolean;
    sketchMode: boolean;
    addOutlines: CornerConnectorInteriorFlowParams['ctx']['addOutlines'];
    cfgSnapshot: CornerConnectorInteriorFlowParams['cfgSnapshot'];
  }
): void {
  if (!emitFoldedClothes) return;
  try {
    emitFoldedClothes(plan.x, plan.y, plan.z, plan.width, parentGroup, plan.maxHeight, plan.maxDepth, policy);
  } catch (error) {
    reportErrorThrottled(App, error, { where: 'corner_ops_emit', op: plan.op, throttleMs: 4000 });
  }
}

export function emitFoldedClothesPlans(
  plans: readonly FoldedClothesSurfacePlan[],
  parentGroup: CornerConnectorInteriorFlowParams['locals']['cornerGroup'],
  emitFoldedClothes: CornerConnectorInteriorEmitters['emitFoldedClothes'],
  reportErrorThrottled: CornerConnectorInteriorFlowParams['helpers']['reportErrorThrottled'],
  App: unknown,
  policy: {
    showContentsEnabled: boolean;
    sketchMode: boolean;
    addOutlines: CornerConnectorInteriorFlowParams['ctx']['addOutlines'];
    cfgSnapshot: CornerConnectorInteriorFlowParams['cfgSnapshot'];
  }
): void {
  for (const plan of plans) {
    emitFoldedClothesPlan(plan, parentGroup, emitFoldedClothes, reportErrorThrottled, App, policy);
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
    !(width > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.leftWidthMinM) ||
    !(usableDepth > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.leftDepthMinM)
  )
    return [];

  const centerX = (postX + wallX) / 2;
  const centerZ = backInset + usableDepth / 2;
  const shelfBottomYs = leftShelfBottomYs.toSorted((a, b) => a - b);
  const plans: FoldedClothesSurfacePlan[] = [];

  const firstStop = shelfBottomYs.length ? shelfBottomYs[0] : shelf1BottomY;
  const floorMaxHeight =
    firstStop - floorTopY - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceHeightClearanceM;
  if (floorMaxHeight > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceMinHeightM) {
    plans.push({
      x: centerX,
      y: floorTopY + CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceYOffsetM,
      z: centerZ,
      width: Math.max(
        CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.widthMinM,
        width - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.widthClearanceM
      ),
      maxHeight: Math.max(
        CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMinM,
        Math.min(CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMaxM, floorMaxHeight)
      ),
      maxDepth: usableDepth,
      op: 'special:leftSurface:floor',
    });
  }

  for (let i = 0; i < shelfBottomYs.length; i++) {
    const topY = shelfBottomYs[i] + woodThick;
    const nextStop = i + 1 < shelfBottomYs.length ? shelfBottomYs[i + 1] : shelf1BottomY;
    const maxHeight = nextStop - topY - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceHeightClearanceM;
    if (maxHeight > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceMinHeightM) {
      plans.push({
        x: centerX,
        y: topY + CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceYOffsetM,
        z: centerZ,
        width: Math.max(
          CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.widthMinM,
          width - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.widthClearanceM
        ),
        maxHeight: Math.max(
          CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMinM,
          Math.min(CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMaxM, maxHeight)
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
    CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeZMinM,
    Math.min(
      L * CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeZRatio,
      L - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeZEndClearanceM
    )
  );
  const safeW = Math.max(
    CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeWidthMinM,
    Math.min(
      L * CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeWidthRatio,
      CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeWidthMaxM
    )
  );
  const safeD = Math.max(
    CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeDepthMinM,
    Math.min(
      CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeDepthMaxM,
      L - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.pentagonSafeDepthEndClearanceM
    )
  );
  const plans: FoldedClothesSurfacePlan[] = [];

  if (shelf1Added) {
    const surfaceY = shelf1BottomY + woodThick + CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceYOffsetM;
    const stopY = shelf2Added ? shelf2BottomY : ceilBottomY;
    const maxHeight = stopY - surfaceY - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceHeightClearanceM;
    if (maxHeight > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceMinHeightM) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMaxM, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:lower',
      });
    }
  }

  if (shelf2Added) {
    const surfaceY = shelf2BottomY + woodThick + CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceYOffsetM;
    const maxHeight =
      ceilBottomY - surfaceY - CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceHeightClearanceM;
    if (maxHeight > CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.surfaceMinHeightM) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY.maxHeightMaxM, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:upper',
      });
    }
  }

  return plans;
}
