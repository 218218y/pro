import type { DrawerVisualEntryLike } from '../../../types';

import type {
  SketchExternalDrawerGroupNode,
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
} from './render_interior_sketch_drawers_external_types.js';

import { toFiniteNumber } from './render_interior_sketch_shared.js';
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
    toFiniteNumber(opPlan.open?.x) ?? opPlan.px,
    toFiniteNumber(opPlan.open?.y) ?? opPlan.py,
    toFiniteNumber(opPlan.open?.z) ?? opPlan.pz + DRAWER_DIMENSIONS.external.openOffsetZM
  );
  const drawerEntry: DrawerVisualEntryLike = {
    group: groupNode,
    closed: closedPos,
    open: openPos,
    id: opPlan.partId,
    dividerKey: opPlan.partId,
  };
  context.drawersArray.push(drawerEntry);
}
