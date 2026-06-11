import type { RenderSketchBoxExternalDrawersArgs } from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { applySketchBoxPickMeta } from './render_interior_sketch_pick_meta.js';
import { createSketchBoxExternalDrawersContext } from './render_interior_sketch_boxes_fronts_drawers_context.js';
import {
  createSketchBoxExternalDrawerOpPlan,
  createSketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_plan.js';
import { createSketchBoxExternalDrawerGroupNode } from './render_interior_sketch_boxes_fronts_drawers_group.js';
import { addSketchBoxExternalDrawerFrontVisual } from './render_interior_sketch_boxes_fronts_drawers_visual.js';
import { addSketchBoxExternalDrawerBoxAndConnector } from './render_interior_sketch_boxes_fronts_drawers_box.js';
import { registerSketchBoxExternalDrawerMotionEntry } from './render_interior_sketch_boxes_fronts_drawers_motion.js';
import { emitExternalDrawerBraceShelf } from './external_drawer_shelf.js';
import { createSketchExternalDrawerBraceShelfPartId } from '../features/shelf_part_identity.js';
import { resolveSketchExternalDrawerStackKey } from './render_interior_sketch_drawers_shared.js';

export function renderSketchBoxExternalDrawers(args: RenderSketchBoxExternalDrawersArgs): void {
  const context = createSketchBoxExternalDrawersContext(args);
  if (!context) return;

  for (let drawerIndex = 0; drawerIndex < context.boxExtDrawers.length; drawerIndex++) {
    const stack = createSketchBoxExternalDrawerStackPlan(
      context,
      context.boxExtDrawers[drawerIndex],
      drawerIndex
    );
    if (!stack || !stack.drawerOps.length) continue;

    emitExternalDrawerBraceShelf({
      createBoard: context.frontsArgs.args.createBoard,
      partId: createSketchExternalDrawerBraceShelfPartId(
        context.moduleKeyStr,
        stack.drawerId,
        context.shell.boxId
      ),
      shelfIndex: `external_drawers_${stack.drawerId}`,
      innerWidth: stack.shelfInnerW,
      shelfThick: context.shelfThick,
      depth: context.shell.geometry.innerD,
      centerX: stack.shelfCenterX,
      stackTopY: stack.baseY + stack.stackH,
      centerZ: context.shell.geometry.innerBackZ + context.shell.geometry.innerD / 2,
      currentBraceShelfMat:
        context.frontsArgs.args.currentBraceShelfMat ||
        context.frontsArgs.args.currentShelfMat ||
        context.shell.boxMat,
      getPartMaterial: context.frontsArgs.args.getPartMaterial,
      getPartColorValue: context.frontsArgs.args.getPartColorValue,
      moduleIndex: context.moduleKeyStr || context.moduleIndex,
      stackKey: resolveSketchExternalDrawerStackKey(context.input, context.moduleKeyStr),
    });

    for (let opIndex = 0; opIndex < stack.drawerOps.length; opIndex++) {
      const opPlan = createSketchBoxExternalDrawerOpPlan(context, stack, stack.drawerOps[opIndex], opIndex);
      if (!opPlan) continue;

      const groupNode = createSketchBoxExternalDrawerGroupNode(context, stack, opPlan);
      addSketchBoxExternalDrawerFrontVisual(context, opPlan, groupNode);
      addSketchBoxExternalDrawerBoxAndConnector(context, opPlan, groupNode);
      applySketchBoxPickMeta(groupNode, opPlan.partId, context.moduleKeyStr, context.shell.boxId);
      groupNode.userData = {
        ...(groupNode.userData || {}),
        __wpSketchExtDrawer: true,
        __wpSketchFreePlacement: context.shell.isFreePlacement === true,
      };
      context.group.add?.(groupNode);
      registerSketchBoxExternalDrawerMotionEntry(context, opPlan, groupNode);
    }
  }
}
