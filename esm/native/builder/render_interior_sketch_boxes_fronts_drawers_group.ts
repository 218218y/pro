import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type {
  SketchBoxExternalDrawerGroupNode,
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
  SketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { readObject } from './render_interior_sketch_shared.js';

export function createSketchBoxExternalDrawerGroupNode(
  context: SketchBoxExternalDrawersContext,
  stack: SketchBoxExternalDrawerStackPlan,
  opPlan: SketchBoxExternalDrawerOpPlan
): SketchBoxExternalDrawerGroupNode {
  const { shell } = context;
  const { boxId: bid, isFreePlacement } = shell;
  const groupNode = new context.THREE.Group();
  groupNode.position?.set?.(opPlan.px, opPlan.py, opPlan.pz);
  groupNode.userData = {
    ...(readObject<InteriorValueRecord>(groupNode.userData) || {}),
    partId: opPlan.partId,
    moduleIndex: context.moduleIndex,
    __wpStack:
      typeof context.moduleKeyStr === 'string' && context.moduleKeyStr.startsWith('lower_')
        ? 'bottom'
        : 'top',
    __doorWidth: opPlan.faceW,
    __doorHeight: opPlan.visualH,
    __wpFaceOffsetX: opPlan.faceOffsetX,
    __wpFaceOffsetY: opPlan.faceOffsetY,
    __wpFaceMinY: opPlan.faceMinY,
    __wpFaceMaxY: opPlan.faceMaxY,
    __wpFrontZ: context.frontZ,
    __wpType: 'extDrawer',
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
    __wpSketchModuleKey: context.moduleKeyStr,
    __wpSketchBoxId: bid,
    __wpSketchFreePlacement: isFreePlacement === true,
  };
  return groupNode;
}
