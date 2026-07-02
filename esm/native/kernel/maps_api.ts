// Native ESM conversion (TypeScript)
// Stage 117 - kernel native
//
// Stage 2+ cleanup:
// - Removed the old model-maps surface.
// - All reads come from the store-backed config snapshot.
// - Map writes route through runtime owner writers; scalar collections use semantic cfg helpers.

import type { AppContainer } from '../../../types';

import { createMapsApiShared } from './maps_api_shared.js';
import { installMapsApiNamedMaps } from './maps_api_named_maps.js';
import { installMapsApiSavedColors } from './maps_api_saved_colors.js';

export function installMapsApi(App: AppContainer): void {
  if (!App || typeof App !== 'object') return;
  ('use strict');

  const shared = createMapsApiShared(App);
  installMapsApiNamedMaps(App, shared);
  installMapsApiSavedColors(App, shared);
}
