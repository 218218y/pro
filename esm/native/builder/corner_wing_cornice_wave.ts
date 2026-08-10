import type { CorniceCtxLike, CorniceLocalsLike } from './corner_wing_cornice_contracts.js';
import { buildCornerWingWaveCornicePlan } from './corner_wing_cornice_plan.js';
import { renderCornerCornicePlan } from './corner_cornice_render.js';

export function applyCornerWingWaveCornice(args: { ctx: CorniceCtxLike; locals: CorniceLocalsLike }): void {
  const { ctx, locals } = args;
  const plan = buildCornerWingWaveCornicePlan(ctx, locals);
  renderCornerCornicePlan(plan, {
    THREE: ctx.THREE,
    group: ctx.wingGroup,
    bodyMat: ctx.bodyMat,
    getCornerMat: ctx.getCornerMat,
    addOutlines: ctx.addOutlines,
    sketchMode: ctx.__sketchMode,
  });
}
