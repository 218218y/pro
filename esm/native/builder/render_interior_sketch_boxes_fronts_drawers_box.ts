import type { InteriorGroupLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
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
  const { boxId: bid, boxMat, isFreePlacement } = shell;
  const drawerBox = context.isFn(context.createInternalDrawerBox)
    ? context.createInternalDrawerBox(
        opPlan.boxW,
        opPlan.boxH,
        opPlan.boxD,
        boxMat,
        boxMat,
        context.input.addOutlines,
        false,
        false
      )
    : new context.THREE.Mesh(new context.THREE.BoxGeometry(opPlan.boxW, opPlan.boxH, opPlan.boxD), boxMat);
  const drawerBoxObj = (readObject<InteriorGroupLike>(drawerBox) || asMesh(drawerBox)) ?? null;
  if (!drawerBoxObj) return;

  drawerBoxObj.position?.set?.(0, 0, opPlan.boxOffsetZ);
  applySketchBoxPickMetaDeep(drawerBoxObj, opPlan.partId, context.moduleKeyStr, bid, {
    __wpSketchExtDrawer: true,
    __wpSketchFreePlacement: isFreePlacement === true,
  });
  groupNode.add?.(drawerBoxObj);
}

function addSketchBoxExternalDrawerConnector(
  context: SketchBoxExternalDrawersContext,
  opPlan: SketchBoxExternalDrawerOpPlan,
  groupNode: InteriorGroupLike
): void {
  if (opPlan.connectorW == null || opPlan.connectorH == null || opPlan.connectorD == null) return;

  const { boxId: bid, boxMat } = context.shell;
  const connector = new context.THREE.Mesh(
    new context.THREE.BoxGeometry(opPlan.connectorW, opPlan.connectorH, opPlan.connectorD),
    boxMat
  );
  connector.position?.set?.(0, 0, opPlan.connectorZ);
  applySketchBoxPickMeta(connector, opPlan.partId, context.moduleKeyStr, bid);
  connector.userData = {
    ...(readObject<InteriorValueRecord>(connector.userData) || {}),
    __wpSketchExtDrawer: true,
  };
  groupNode.add?.(connector);
}
