import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import { EXTERNAL_DRAWER_CONTENTS_POLICY } from '../../shared/dimensions/external_drawer_policy.js';
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
import { hasSketchDrawerDivider } from './render_interior_sketch_drawer_dividers.js';

export function addSketchExternalDrawerBoxAndConnector(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): InteriorGroupLike | null {
  const drawerBox = addSketchExternalDrawerBox(context, stack, opPlan, groupNode);
  addSketchExternalDrawerConnector(context, stack, opPlan, groupNode);
  return drawerBox;
}

function addSketchExternalDrawerBox(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opPlan: SketchExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): InteriorGroupLike | null {
  const hasDivider = hasSketchDrawerDivider({
    input: context.input,
    partId: opPlan.partId,
  });
  const drawerBox = context.isFn(context.input.createInternalDrawerBox)
    ? context.input.createInternalDrawerBox(
        opPlan.boxW,
        opPlan.boxH,
        opPlan.boxD,
        opPlan.boxMat,
        opPlan.boxMat,
        context.input.addOutlines,
        hasDivider,
        false,
        opPlan.omitBoxFrontPanel === true ? { omitFrontPanel: true } : null
      )
    : new context.THREE.Mesh(
        new context.THREE.BoxGeometry(opPlan.boxW, opPlan.boxH, opPlan.boxD),
        opPlan.boxMat
      );
  const drawerBoxObj = readObject<InteriorGroupLike>(drawerBox) ?? null;
  if (!drawerBoxObj) return null;

  drawerBoxObj.position?.set?.(0, 0, opPlan.boxOffsetZ);
  applySketchModulePickMetaDeep(drawerBoxObj, opPlan.boxPartId, context.moduleKeyStr, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: opPlan.partId,
    __doorWidth: opPlan.boxW,
    __doorHeight: opPlan.boxH,
  });
  if (context.outlineFn) context.outlineFn(drawerBoxObj);

  if (context.input.showContentsEnabled === true && context.isFn(context.input.addFoldedClothes)) {
    context.input.addFoldedClothes(
      0,
      -opPlan.boxH / 2 + EXTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM,
      0,
      opPlan.boxW - EXTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM,
      drawerBoxObj,
      Math.max(0, opPlan.boxH - EXTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM),
      opPlan.boxD,
      {
        showContentsEnabled: context.input.showContentsEnabled === true,
        sketchMode: context.input.sketchMode === true,
        addOutlines: context.input.addOutlines || null,
        cfgSnapshot: context.input.cfgSnapshot,
      }
    );
  }

  groupNode.add?.(drawerBoxObj);
  return drawerBoxObj;
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
    opPlan.boxMat
  );
  connector.position?.set?.(0, 0, opPlan.connectorZ);
  applySketchModulePickMeta(connector, opPlan.boxPartId, context.moduleKeyStr, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: stack.drawerId,
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: opPlan.partId,
    __doorWidth: opPlan.connectorW,
    __doorHeight: opPlan.connectorH,
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
