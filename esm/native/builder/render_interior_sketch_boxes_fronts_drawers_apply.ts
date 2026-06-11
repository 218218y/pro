import type { RenderSketchBoxExternalDrawersArgs } from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { createSketchBoxExternalDrawersContext } from './render_interior_sketch_boxes_fronts_drawers_context.js';
import {
  createSketchBoxExternalDrawerOpPlan,
  createSketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_plan.js';
import { createSketchBoxExternalDrawerGroupNode } from './render_interior_sketch_boxes_fronts_drawers_group.js';
import { addSketchBoxExternalDrawerFrontVisual } from './render_interior_sketch_boxes_fronts_drawers_visual.js';
import { addSketchBoxExternalDrawerBoxAndConnector } from './render_interior_sketch_boxes_fronts_drawers_box.js';
import { registerSketchBoxExternalDrawerMotionEntry } from './render_interior_sketch_boxes_fronts_drawers_motion.js';

export function renderSketchBoxExternalDrawers(args: RenderSketchBoxExternalDrawersArgs): void {
  const context = createSketchBoxExternalDrawersContext(args);
  if (!context) return;

  for (let drawerIndex = 0; drawerIndex < context.boxExtDrawers.length; drawerIndex++) {
    const stack = createSketchBoxExternalDrawerStackPlan(
      context,
      context.boxExtDrawers[drawerIndex],
      drawerIndex
    );
    if (!stack) continue;

    for (let opIndex = 0; opIndex < stack.drawerOps.length; opIndex++) {
      const opPlan = createSketchBoxExternalDrawerOpPlan(context, stack, stack.drawerOps[opIndex], opIndex);
      if (!opPlan) continue;

      const groupNode = createSketchBoxExternalDrawerGroupNode(context, stack, opPlan);
      addSketchBoxExternalDrawerFrontVisual(context, opPlan, groupNode);
      addSketchBoxExternalDrawerBoxAndConnector(context, opPlan, groupNode);
      applySketchBoxPickMetaDeep(groupNode, opPlan.partId, context.moduleKeyStr, context.shell.boxId, {
        __wpSketchExtDrawer: true,
        __wpSketchFreePlacement: context.shell.isFreePlacement === true,
      });
      context.group.add?.(groupNode);
      registerSketchBoxExternalDrawerMotionEntry(context, opPlan, groupNode);
    }
  }
}
