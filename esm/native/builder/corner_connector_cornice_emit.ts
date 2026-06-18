// Corner connector cornice helpers.
//
// Keep the public connector owner as the canonical seam while the diagonal
// wave/profile builders and selector hitbox live on focused helpers.

import { appendCornerConnectorCorniceHitArea } from './corner_connector_cornice_shared.js';
import type { CornerConnectorCorniceFlowParams } from './corner_connector_cornice_shared.js';
import { applyCornerConnectorWaveCornice } from './corner_connector_cornice_wave.js';
import { applyCornerConnectorProfileCornice } from './corner_connector_cornice_profile.js';

export function applyCornerConnectorCornice(params: CornerConnectorCorniceFlowParams): void {
  const { ctx, locals, helpers } = params;
  const { App, hasCorniceEnabled = true, __corniceAllowedForThisStack, __corniceTypeNorm } = ctx;
  const { reportErrorThrottled } = helpers;

  // --- Corner connector (pentagon) cornice ---
  // The front diagonal is always visible. Attach-edge side returns are emitted only
  // when the neighboring main/wing cell is lower (or missing), matching regular
  // segmented carcass cornice behavior for stepped heights.
  if (hasCorniceEnabled && __corniceAllowedForThisStack) {
    try {
      if (__corniceTypeNorm === 'wave') {
        applyCornerConnectorWaveCornice({ ctx, locals });
      } else {
        applyCornerConnectorProfileCornice({ ctx, locals, helpers });
      }
    } catch (_e) {
      reportErrorThrottled(App, _e, { where: 'corner_ops_emit', op: 'L2502', throttleMs: 4000 });
    }
  }

  // Small invisible hit area for selecting / future door placement.
  appendCornerConnectorCorniceHitArea({ ctx, locals });

  // Add to the main wardrobe group (world-aligned).
  // Enable stable shadows for the pentagon connector body (exclude doors/drawers).
}
