import type { DrawerVisualEntryLike } from '../../../types';

import type {
  SketchBoxExternalDrawerGroupNode,
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { readRenderOpNumber } from './render_ops_number_contracts.js';

export function registerSketchBoxExternalDrawerMotionEntry(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: SketchBoxExternalDrawerGroupNode
): void {
  const closedPos = makeSketchBoxDrawerMotionPoint(context, opPlan.px, opPlan.py, opPlan.pz);
  const openPos = makeSketchBoxDrawerMotionPoint(
    context,
    readRenderOpNumber(opPlan.open?.x) ?? opPlan.px,
    readRenderOpNumber(opPlan.open?.y) ?? opPlan.py,
    readRenderOpNumber(opPlan.open?.z) ?? opPlan.pz + 0.35
  );
  const drawerEntry: DrawerVisualEntryLike = {
    group: groupNode,
    closed: closedPos,
    open: openPos,
    id: opPlan.partId,
    dividerKey: opPlan.partId,
    isInternal: false,
  };
  context.drawersArray.push(drawerEntry);
}

function makeSketchBoxDrawerMotionPoint(
  context: SketchBoxExternalDrawersContext,
  x: number,
  y: number,
  z: number
): DrawerVisualEntryLike['closed'] {
  return typeof context.THREE.Vector3 === 'function' ? new context.THREE.Vector3(x, y, z) : { x, y, z };
}
