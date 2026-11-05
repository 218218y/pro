import type {
  CornerConnectorCorniceCtx,
  CornerConnectorCorniceLocals,
} from './corner_connector_cornice_shared.js';
import { buildCornerConnectorProfileCornicePlan } from './corner_connector_cornice_plan.js';
import { renderCornerCornicePlan } from './corner_cornice_render.js';

export function applyCornerConnectorProfileCornice(args: {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
  straight?: boolean;
}): void {
  const { ctx, locals } = args;
  const plan = buildCornerConnectorProfileCornicePlan(ctx, locals, args.straight === true);
  renderCornerCornicePlan(plan, {
    THREE: ctx.THREE,
    group: locals.cornerGroup,
    bodyMat: ctx.bodyMat,
    getCornerMat: ctx.getCornerMat,
    addOutlines: ctx.addOutlines,
    sketchMode: ctx.__sketchMode,
  });
}
