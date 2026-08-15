import type { ActionMetaLike, AppContainer } from '../../../../../types';

import {
  patchUi as patchUiApi,
  patchUiLightingState as patchUiLightingStateApi,
  patchUiSoft as patchUiSoftApi,
  setUiLastSelectedWallColor as setUiLastSelectedWallColorApi,
  setUiLightScalar as setUiLightScalarApi,
  setUiRawScalar as setUiRawScalarApi,
  setUiScalar as setUiScalarApi,
  setUiScalarSoft as setUiScalarSoftApi,
} from '../../../services/api.js';
import { getUiNamespace } from './store_actions_state.js';
import type { StoreUiActionRuntime } from './store_actions_ui_contracts.js';

const runtimeCache = new WeakMap<AppContainer, StoreUiActionRuntime>();

export function createStoreUiActionRuntime(app: AppContainer): StoreUiActionRuntime {
  return {
    readUiActions: () => getUiNamespace(app),
    patch: (patch, meta) => {
      void patchUiApi(app, patch, meta);
    },
    patchSoft: (patch, meta) => {
      void patchUiSoftApi(app, patch, meta);
    },
    setRawScalar: (key: string, value: unknown, meta?: ActionMetaLike) => {
      void setUiRawScalarApi(app, key, value, meta);
    },
    setScalar: (key, value, meta) => {
      void setUiScalarApi(app, key, value, meta);
    },
    setScalarSoft: (key, value, meta) => {
      void setUiScalarSoftApi(app, key, value, meta);
    },
    setLastSelectedWallColor: (value, meta) => {
      void setUiLastSelectedWallColorApi(app, value, meta);
    },
    setLightScalar: (key, value, meta) => {
      void setUiLightScalarApi(app, key, value, meta);
    },
    patchLightingState: (patch, meta) => {
      void patchUiLightingStateApi(app, patch, meta);
    },
  };
}

export function getStoreUiActionRuntime(app: AppContainer): StoreUiActionRuntime {
  const cached = runtimeCache.get(app);
  if (cached) return cached;
  const runtime = createStoreUiActionRuntime(app);
  runtimeCache.set(app, runtime);
  return runtime;
}
