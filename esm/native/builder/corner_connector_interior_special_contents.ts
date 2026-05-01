// Corner connector special interior folded-content planning.
//
// This owner plans and emits folded-clothes surfaces. It deliberately does not
// create connector geometry or mutate shelf meshes.

import type { CornerConnectorInteriorEmitters, CornerConnectorInteriorFlowParams } from './corner_connector_interior_shared.js';
import type { FoldedClothesSurfacePlan } from './corner_connector_interior_special_types.js';

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
  if (!(width > 0.28) || !(usableDepth > 0.18)) return [];

  const centerX = (postX + wallX) / 2;
  const centerZ = backInset + usableDepth / 2;
  const shelfBottomYs = leftShelfBottomYs.slice().sort((a, b) => a - b);
  const plans: FoldedClothesSurfacePlan[] = [];

  const firstStop = shelfBottomYs.length ? shelfBottomYs[0] : shelf1BottomY;
  const floorMaxHeight = firstStop - floorTopY - 0.02;
  if (floorMaxHeight > 0.08) {
    plans.push({
      x: centerX,
      y: floorTopY + 0.002,
      z: centerZ,
      width: Math.max(0.2, width - 0.06),
      maxHeight: Math.max(0.12, Math.min(0.65, floorMaxHeight)),
      maxDepth: usableDepth,
      op: 'special:leftSurface:floor',
    });
  }

  for (let i = 0; i < shelfBottomYs.length; i++) {
    const topY = shelfBottomYs[i] + woodThick;
    const nextStop = i + 1 < shelfBottomYs.length ? shelfBottomYs[i + 1] : shelf1BottomY;
    const maxHeight = nextStop - topY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: centerX,
        y: topY + 0.002,
        z: centerZ,
        width: Math.max(0.2, width - 0.06),
        maxHeight: Math.max(0.12, Math.min(0.65, maxHeight)),
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
  const safeZ = Math.max(0.14, Math.min(L * 0.35, L - 0.18));
  const safeW = Math.max(0.35, Math.min(L * 0.85, 0.9));
  const safeD = Math.max(0.22, Math.min(0.34, L - 0.12));
  const plans: FoldedClothesSurfacePlan[] = [];

  if (shelf1Added) {
    const surfaceY = shelf1BottomY + woodThick + 0.002;
    const stopY = shelf2Added ? shelf2BottomY : ceilBottomY;
    const maxHeight = stopY - surfaceY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(0.65, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:lower',
      });
    }
  }

  if (shelf2Added) {
    const surfaceY = shelf2BottomY + woodThick + 0.002;
    const maxHeight = ceilBottomY - surfaceY - 0.02;
    if (maxHeight > 0.08) {
      plans.push({
        x: safeX,
        y: surfaceY,
        z: safeZ,
        width: safeW,
        maxHeight: Math.min(0.65, maxHeight),
        maxDepth: safeD,
        op: 'special:topContents:upper',
      });
    }
  }

  return plans;
}
