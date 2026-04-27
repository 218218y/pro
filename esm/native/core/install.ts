// Core install surface (Pure ESM)
//
// Core/State layer owns store/history/autosave/edit-state/cloud-sync orchestration.
// This module also installs a stable runtime layer facade on `App.layers.core` so
// callers have one canonical place to discover the core API/install surfaces.

import type { AppContainer, CoreLayerFacadeLike } from '../../../types';

import * as coreApiNs from './api.js';

import { ensureAppLayer } from '../runtime/layers_access.js';
import { seedUiEphemeralDefaults } from '../services/ui_ephemeral_defaults.js';
import { installHistoryService } from '../services/history.js';
import { installEditStateService } from '../services/edit_state.js';
import { installAutosaveService } from '../services/autosave.js';
import { installModelsService } from '../services/models.js';
import { installCloudSyncService } from '../services/cloud_sync.js';
import { installAppStartService } from '../services/app_start.js';
import { installBootFinalizers } from '../services/boot_finalizers.js';
import { installBootSeedsPart02 } from '../services/boot_seeds_part02.js';
import { installConfigCompoundsService } from '../services/config_compounds.js';

const CORE_API_SURFACE = Object.freeze({ ...coreApiNs });
const CORE_INSTALL_SURFACE = Object.freeze({
  seedUiEphemeralDefaults,
  installHistoryService,
  installEditStateService,
  installAutosaveService,
  installModelsService,
  installCloudSyncService,
  installAppStartService,
  installBootFinalizers,
  installBootSeedsPart02,
  installConfigCompoundsService,
});

type CoreApiSurface = typeof CORE_API_SURFACE;
type CoreInstallSurface = typeof CORE_INSTALL_SURFACE;

export type InstalledCoreLayerSurface = CoreLayerFacadeLike & {
  kind?: 'core';
  api?: CoreApiSurface;
  install?: CoreInstallSurface;
};

function isInstalledCoreLayerSurface(layer: CoreLayerFacadeLike): layer is InstalledCoreLayerSurface {
  return layer.kind === 'core' && layer.api === CORE_API_SURFACE && layer.install === CORE_INSTALL_SURFACE;
}

export function installCoreLayerSurface(App: AppContainer): InstalledCoreLayerSurface {
  const layer = ensureAppLayer(App, 'core');
  if (isInstalledCoreLayerSurface(layer)) return layer;
  const kind: InstalledCoreLayerSurface['kind'] = 'core';
  Object.assign(layer, {
    kind,
    api: CORE_API_SURFACE,
    install: CORE_INSTALL_SURFACE,
  });
  if (isInstalledCoreLayerSurface(layer)) return layer;
  throw new Error('[core/install] failed to install core layer surface');
}

export { seedUiEphemeralDefaults };

export { installHistoryService };
export { installEditStateService };
export { installAutosaveService };
export { installModelsService };
export { installCloudSyncService };
export { installAppStartService };
export { installBootFinalizers };
export { installBootSeedsPart02 };
export { installConfigCompoundsService };
