import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import type {
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';

import { readObject } from './render_interior_sketch_shared.js';
import {
  applySketchModulePickMeta,
  applySketchModulePickMetaDeep,
} from './render_interior_sketch_pick_meta.js';

export function addSketchExternalDrawerBoxAndConnector(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  addSketchExternalDrawerBox(context, stack, opPlan, groupNode);
  addSketchExternalDrawerConnector(context, stack, opPlan, groupNode);
}

function addSketchExternalDrawerBox(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  const drawerBox = context.isFn(context.input.createInternalDrawerBox)
    ? context.input.createInternalDrawerBox(
        opPlan.boxW,
        opPlan.boxH,
        opPlan.boxD,
        context.bodyMat,
        context.bodyMat,
        context.input.addOutlines,
        false,
        false,
        opPlan.omitBoxFrontPanel === true ? { omitFrontPanel: true } : null
      )
    : new context.THREE.Mesh(
        new context.THREE.BoxGeometry(opPlan.boxW, opPlan.boxH, opPlan.boxD),
        context.bodyMat
      );
  const drawerBoxObj = readObject<InteriorGroupLike>(drawerBox) ?? null;
  if (!drawerBoxObj) return;

  drawerBoxObj.position?.set?.(0, 0, opPlan.boxOffsetZ);
  applySketchModulePickMetaDeep(drawerBoxObj, opPlan.partId, context.moduleKeyStr, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
  });
  if (context.outlineFn) context.outlineFn(drawerBoxObj);
  groupNode.add?.(drawerBoxObj);
}

function addSketchExternalDrawerConnector(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  if (opPlan.omitConnectorPanel === true || !hasPositiveConnectorDimensions(opPlan)) return;

  const connector = new context.THREE.Mesh(
    new context.THREE.BoxGeometry(opPlan.connectorW, opPlan.connectorH, opPlan.connectorD),
    context.bodyMat
  );
  connector.position?.set?.(0, 0, opPlan.connectorZ);
  applySketchModulePickMeta(connector, opPlan.partId, context.moduleKeyStr, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
  });
  if (context.outlineFn) context.outlineFn(connector);
  groupNode.add?.(connector);
}

function hasPositiveConnectorDimensions(
  opPlan: SketchExternalDrawerOpPlan
): opPlan is SketchExternalDrawerOpPlan & { connectorW: number; connectorH: number; connectorD: number } {
  return (
    opPlan.connectorW != null &&
    opPlan.connectorH != null &&
    opPlan.connectorD != null &&
    opPlan.connectorW > 0 &&
    opPlan.connectorH > 0 &&
    opPlan.connectorD > 0
  );
}
