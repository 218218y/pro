import type { DrawerVisualEntryLike } from '../../../types';

import type {
  SketchExternalDrawerGroupNode,
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
} from './render_interior_sketch_drawers_external_types.js';

import { readRenderOpNumber } from './render_ops_number_contracts.js';
import { createSketchDrawerMotionPoint } from './render_interior_sketch_drawers_shared.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export function registerSketchExternalDrawerMotionEntry(
  context: SketchExternalDrawerRenderContext,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: SketchExternalDrawerGroupNode
): void {
  const closedPos = createSketchDrawerMotionPoint(context.THREE, opPlan.px, opPlan.py, opPlan.pz);
  const openPos = createSketchDrawerMotionPoint(
    context.THREE,
    readRenderOpNumber(opPlan.open?.x) ?? opPlan.px,
    readRenderOpNumber(opPlan.open?.y) ?? opPlan.py,
    readRenderOpNumber(opPlan.open?.z) ?? opPlan.pz + DRAWER_DIMENSIONS.external.openOffsetZM
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
