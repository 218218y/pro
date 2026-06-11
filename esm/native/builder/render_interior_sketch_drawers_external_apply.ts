import type { ApplySketchExternalDrawersArgs } from './render_interior_sketch_drawers_shared.js';

import { applySketchModulePickMetaDeep } from './render_interior_sketch_pick_meta.js';
import { createSketchExternalDrawerRenderContext } from './render_interior_sketch_drawers_external_context.js';
import {
  createSketchExternalDrawerOpPlan,
  createSketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_plan.js';
import { createSketchExternalDrawerGroupNode } from './render_interior_sketch_drawers_external_group.js';
import { addSketchExternalDrawerFrontVisual } from './render_interior_sketch_drawers_external_visual.js';
import { addSketchExternalDrawerBoxAndConnector } from './render_interior_sketch_drawers_external_box.js';
import { registerSketchExternalDrawerMotionEntry } from './render_interior_sketch_drawers_external_motion.js';

export function applySketchExternalDrawers(args: ApplySketchExternalDrawersArgs): void {
  const context = createSketchExternalDrawerRenderContext(args);
  if (!context) return;

  try {
    for (let i = 0; i < context.extDrawers.length; i++) {
      const stack = createSketchExternalDrawerStackPlan(context, context.extDrawers[i], i);
      if (!stack) continue;

      for (let j = 0; j < stack.drawerOps.length; j++) {
        const opPlan = createSketchExternalDrawerOpPlan(context, stack, stack.drawerOps[j], j);
        if (!opPlan) continue;

        const groupNode = createSketchExternalDrawerGroupNode(context, stack, opPlan);
        addSketchExternalDrawerFrontVisual(context, stack, opPlan, groupNode);
        addSketchExternalDrawerBoxAndConnector(context, stack, opPlan, groupNode);
        applySketchModulePickMetaDeep(groupNode, opPlan.partId, context.moduleKeyStr, {
          __wpSketchExtDrawer: true,
          __wpSketchExtDrawerId: stack.drawerId,
        });
        context.group.add?.(groupNode);
        registerSketchExternalDrawerMotionEntry(context, opPlan, groupNode);
      }
    }
  } catch (error) {
    context.renderOpsHandleCatch(context.App, 'applyInteriorSketchExtras.extDrawers', error, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
  }
}
