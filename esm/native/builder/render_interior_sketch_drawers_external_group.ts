import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type {
  SketchExternalDrawerGroupNode,
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';

import { readObject } from './render_interior_sketch_shared.js';
import {
  resolveSketchExternalDrawerModuleIndexValue,
  resolveSketchExternalDrawerStackKey,
} from './render_interior_sketch_drawers_shared.js';

export function createSketchExternalDrawerGroupNode(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan
): SketchExternalDrawerGroupNode {
  const groupNode = new context.THREE.Group();
  groupNode.position?.set?.(opPlan.px, opPlan.py, opPlan.pz);

  const groupUd = readObject<InteriorValueRecord>(groupNode.userData) || {};
  const resolvedModuleIndex = resolveSketchExternalDrawerModuleIndexValue(
    context.moduleKeyStr,
    context.moduleIndex
  );
  const resolvedStackKey = resolveSketchExternalDrawerStackKey(context.input, context.moduleKeyStr);
  groupUd.partId = opPlan.partId;
  groupUd.moduleIndex = resolvedModuleIndex || context.moduleIndex;
  groupUd.__wpStack = resolvedStackKey;
  groupUd.__doorWidth = opPlan.faceW;
  groupUd.__doorHeight = opPlan.visualH;
  groupUd.__wpFaceOffsetX = opPlan.faceOffsetX;
  groupUd.__wpFaceOffsetY = opPlan.faceOffsetY;
  groupUd.__wpFaceMinY = opPlan.faceMinY;
  groupUd.__wpFaceMaxY = opPlan.faceMaxY;
  groupUd.__wpFrontZ = context.frontZ;
  groupUd.__wpType = 'extDrawer';
  groupUd.__wpSketchExtDrawerId = stack.drawerId;
  groupUd.__wpSketchModuleKey = context.moduleKeyStr;
  groupNode.userData = groupUd;

  return groupNode;
}
