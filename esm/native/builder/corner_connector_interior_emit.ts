// Corner connector interior helpers.
//
// Keep the public connector owner as the canonical seam while the pentagon
// special-layout and attach-rod flows live on focused helpers.

import {
  createCornerConnectorInteriorEmitters,
  type CornerConnectorInteriorFlowParams,
} from './corner_connector_interior_shared.js';
import { applyCornerConnectorSpecialInterior } from './corner_connector_interior_special.js';
import { applyCornerConnectorAttachRod } from './corner_connector_interior_rod.js';

export function applyCornerConnectorInteriorFlow(params: CornerConnectorInteriorFlowParams): void {
  const emitters = createCornerConnectorInteriorEmitters(params.ctx);

  applyCornerConnectorSpecialInterior({
    ...params,
    emitters: { emitFoldedClothes: emitters.emitFoldedClothes },
  });

  applyCornerConnectorAttachRod({
    ...params,
    emitters: {
      emitRealisticHanger: emitters.emitRealisticHanger,
      emitHangingClothes: emitters.emitHangingClothes,
    },
  });
}
