import type { InteriorGroupLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { asMesh, readObject } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta, applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';

export function addSketchBoxExternalDrawerBoxAndConnector(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  addSketchBoxExternalDrawerBox(context, opPlan, groupNode);
  addSketchBoxExternalDrawerConnector(context, opPlan, groupNode);
}

function addSketchBoxExternalDrawerBox(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  const { shell } = context;
  const { boxId: bid, isFreePlacement } = shell;
  const drawerBox = context.isFn(context.createInternalDrawerBox)
    ? context.createInternalDrawerBox(
        opPlan.boxW,
        opPlan.boxH,
        opPlan.boxD,
        opPlan.boxMat,
        opPlan.boxMat,
        context.input.addOutlines,
        false,
        false,
        opPlan.omitBoxFrontPanel === true ? { omitFrontPanel: true } : null
      )
    : new context.THREE.Mesh(
        new context.THREE.BoxGeometry(opPlan.boxW, opPlan.boxH, opPlan.boxD),
        opPlan.boxMat
      );
  const drawerBoxObj = (readObject<InteriorGroupLike>(drawerBox) || asMesh(drawerBox)) ?? null;
  if (!drawerBoxObj) return;

  drawerBoxObj.position?.set?.(0, 0, opPlan.boxOffsetZ);
  applySketchBoxPickMetaDeep(drawerBoxObj, opPlan.boxPartId, context.moduleKeyStr, bid, {
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: opPlan.drawerId,
    __wpRegularExternalDrawer: opPlan.isRegularExternalDrawer === true,
    __wpSketchFreePlacement: isFreePlacement === true,
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: opPlan.partId,
    __doorWidth: opPlan.boxW,
    __doorHeight: opPlan.boxH,
  });
  if (context.input.showContentsEnabled === true && context.isFn(context.input.addFoldedClothes)) {
    context.input.addFoldedClothes(
      0,
      -opPlan.boxH / 2 + DRAWER_DIMENSIONS.external.contentsBottomInsetM,
      0,
      opPlan.boxW - DRAWER_DIMENSIONS.external.contentsWidthClearanceM,
      drawerBoxObj,
      Math.max(0, opPlan.boxH - DRAWER_DIMENSIONS.external.contentsHeightClearanceM),
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
}

function addSketchBoxExternalDrawerConnector(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  if (
    opPlan.omitConnectorPanel === true ||
    opPlan.connectorW == null ||
    opPlan.connectorH == null ||
    opPlan.connectorD == null
  )
    return;

  const { boxId: bid } = context.shell;
  const connector = new context.THREE.Mesh(
    new context.THREE.BoxGeometry(opPlan.connectorW, opPlan.connectorH, opPlan.connectorD),
    opPlan.boxMat
  );
  connector.position?.set?.(0, 0, opPlan.connectorZ);
  applySketchBoxPickMeta(connector, opPlan.boxPartId, context.moduleKeyStr, bid);
  connector.userData = {
    ...(readObject<InteriorValueRecord>(connector.userData) || {}),
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: opPlan.drawerId,
    __wpRegularExternalDrawer: opPlan.isRegularExternalDrawer === true,
    __wpDrawerBox: true,
    __wpDrawerOwnerPartId: opPlan.partId,
    __doorWidth: opPlan.connectorW,
    __doorHeight: opPlan.connectorH,
  };
  groupNode.add?.(connector);
}
