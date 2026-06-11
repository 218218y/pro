// Corner wing cornice emission helpers.
//
// Keep the public owner as the canonical seam while wave/profile builders live
// on dedicated helpers.

import {
  isCorniceCtxLike,
  isCorniceHelpersLike,
  isCorniceLocalsLike,
} from './corner_wing_cornice_contracts.js';
import type { CorniceParamsLike } from './corner_wing_cornice_contracts.js';
import { applyCornerWingWaveCornice } from './corner_wing_cornice_wave.js';
import { applyCornerWingProfileCornice } from './corner_wing_cornice_profile.js';

export function applyCornerWingCornice(params: CorniceParamsLike): void {
  const ctx = isCorniceCtxLike(params.ctx) ? params.ctx : null;
  const locals = isCorniceLocalsLike(params.locals) ? params.locals : null;
  const helpers = isCorniceHelpersLike(params.helpers) ? params.helpers : null;
  if (!ctx || !locals || !helpers) return;
  if (!(ctx.hasCorniceEnabled && ctx.__corniceAllowedForThisStack)) return;

  if (ctx.__corniceTypeNorm === 'wave') {
    applyCornerWingWaveCornice({ ctx, locals });
    return;
  }

  applyCornerWingProfileCornice({ ctx, locals, helpers });
}
