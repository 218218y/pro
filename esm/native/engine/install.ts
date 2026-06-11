// Engine install surface (Pure ESM)
//
// Engine layer owns Three.js runtime services and viewport/build consumers.
// This module also installs a stable runtime layer facade on `App.layers.engine`.

import type { AppContainer, EngineLayerFacadeLike } from '../../../types';

import * as engineApiNs from './api.js';

import { ensureAppLayer } from '../runtime/layers_access.js';
import { installTexturesCacheService } from '../services/textures_cache.js';
import { installCameraService } from '../services/camera.js';
import { installSceneViewService } from '../services/scene_view.js';
import { installViewportRuntimeService } from '../services/viewport_runtime.js';
import { installBuildReactionsService } from '../services/build_reactions.js';
import { installDoorsRuntimeService } from '../services/doors_runtime.js';
import { installCanvasPickingService } from '../services/canvas_picking.js';

const ENGINE_API_SURFACE = Object.freeze({ ...engineApiNs });
const ENGINE_INSTALL_SURFACE = Object.freeze({
  installTexturesCacheService,
  installCameraService,
  installSceneViewService,
  installViewportRuntimeService,
  installBuildReactionsService,
  installDoorsRuntimeService,
  installCanvasPickingService,
});

type EngineApiSurface = typeof ENGINE_API_SURFACE;
type EngineInstallSurface = typeof ENGINE_INSTALL_SURFACE;

const ENGINE_LAYER_KIND: InstalledEngineLayerSurface['kind'] = 'engine';

export type InstalledEngineLayerSurface = EngineLayerFacadeLike & {
  kind?: 'engine';
  api?: EngineApiSurface;
  install?: EngineInstallSurface;
};

export function installEngineLayerSurface(App: AppContainer): InstalledEngineLayerSurface {
  const layer = ensureAppLayer(App, 'engine');
  if (
    layer.kind === 'engine' &&
    layer.api === ENGINE_API_SURFACE &&
    layer.install === ENGINE_INSTALL_SURFACE
  ) {
    return Object.assign(layer, {
      kind: ENGINE_LAYER_KIND,
      api: ENGINE_API_SURFACE,
      install: ENGINE_INSTALL_SURFACE,
    });
  }
  return Object.assign(layer, {
    kind: ENGINE_LAYER_KIND,
    api: ENGINE_API_SURFACE,
    install: ENGINE_INSTALL_SURFACE,
  });
}

export { installTexturesCacheService };
export { installCameraService };
export { installSceneViewService };
export { installViewportRuntimeService };
export { installBuildReactionsService };
export { installDoorsRuntimeService };
export { installCanvasPickingService };
