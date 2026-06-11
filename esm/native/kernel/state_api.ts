// Kernel state actions (TypeScript)
//
// Stores-only policy:
// - No App.select surface.
// - Provide a stable App.actions.* API for writing state through the store / committing layer.
//
// This module is side-effect free on import. Call installStateApi(App) explicitly.

import type { AppContainer, UnknownRecord, ActionMetaLike } from '../../../types';

import { asRecord as asObj, isRecord as isObj } from '../runtime/record.js';
import { assertStore } from '../runtime/assert.js';
import { ensureStateApiNamespaces } from './actions_root.js';
import { installStateApiStackRouter } from './state_api_stack_router.js';
import { installStateApiHistoryMetaReactivity } from './state_api_history_meta_reactivity.js';
import { installStateApiConfigNamespace } from './state_api_config_namespace.js';
import {
  asMeta,
  mergeMetaWithDefaults,
  MODULES_GEOMETRY_REPLACE_KEYS,
  normMeta,
  PAINT_CONFIG_REPLACE_KEYS,
  PROJECT_CONFIG_REPLACE_KEYS,
  safeCall,
  shallowCloneObj,
} from './state_api_shared.js';
import type { SetCfgScalarFn } from './state_api_shared.js';
import { installStateApiSurfaceNamespaces } from './state_api_surface_namespaces.js';
import { createStateApiInstallSupport } from './state_api_install_support.js';

export function isStateApiInstalled(app: unknown): boolean {
  const rec = asObj(app);
  return !!(rec && rec['__state_api_esm_v1'] === true);
}

export function installStateApi(App: AppContainer): void {
  const A = asObj<AppContainer>(App);
  if (!A) return;
  if (A['__state_api_esm_v1'] === true) return;

  const {
    actions,
    meta: metaActionsNs,
    runtime: runtimeNs,
    ui: uiNs,
    config: configNs,
    mode: modeNs,
    builder: builderNs,
    modules: modulesNs,
    corner: cornerNs,
    history: historyNs,
    store: storeNs,
  } = ensureStateApiNamespaces(App);

  const getSetCfgScalar = (): SetCfgScalarFn | null => {
    const fn = typeof actions.setCfgScalar === 'function' ? actions.setCfgScalar : configNs.setScalar;
    return typeof fn === 'function' ? fn : null;
  };

  const mergeMeta = (
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    defaults: ActionMetaLike,
    sourceFallback: string
  ): ActionMetaLike => mergeMetaWithDefaults(meta, defaults, sourceFallback);

  const store = assertStore(App, 'kernel/state_api');
  const {
    callStoreWriter,
    commitUiPatch,
    commitRuntimePatch,
    commitModePatch,
    commitConfigPatch,
    commitMetaPatch,
    commitMetaTouch,
    dispatchCanonicalPatch,
    readRootSnapshot,
    readCfgSnapshot,
    readUiSnapshot,
  } = createStateApiInstallSupport(App, store);

  const callSetCfgScalar = (key: string, valueOrFn: unknown, meta?: ActionMetaLike): unknown => {
    const setCfgScalar = getSetCfgScalar();
    return setCfgScalar ? setCfgScalar(key, valueOrFn, meta) : undefined;
  };

  installStateApiStackRouter({
    modulesNs,
    cornerNs,
    getSetCfgScalar,
    mergeMeta,
    normMeta,
    readCfgSnapshot,
    readUiSnapshot,
    callSetCfgScalar,
    shallowCloneObj,
    safeCall,
  });

  installStateApiSurfaceNamespaces({
    App,
    actions,
    metaActionsNs,
    uiNs,
    runtimeNs,
    modeNs,
    builderNs,
    modulesNs,
    dispatchCanonicalPatch,
    commitUiPatch,
    commitRuntimePatch,
    commitModePatch,
    callStoreWriter,
    readRootSnapshot,
    asObj,
    isObj,
    safeCall,
  });

  installStateApiConfigNamespace({
    actions,
    configNs,
    metaActionsNs,
    store,
    readCfgSnapshot,
    readUiSnapshot,
    normMeta,
    safeCall,
    shallowCloneObj,
    commitConfigPatch,
    projectConfigReplaceKeys: PROJECT_CONFIG_REPLACE_KEYS,
    paintConfigReplaceKeys: PAINT_CONFIG_REPLACE_KEYS,
    modulesGeometryReplaceKeys: MODULES_GEOMETRY_REPLACE_KEYS,
  });

  installStateApiHistoryMetaReactivity({
    A,
    store,
    storeNs,
    historyNs,
    metaActionsNs,
    asObj,
    safeCall,
    normMeta,
    mergeMeta,
    isObj,
    commitMetaTouch,
    asMeta,
    commitMetaPatch,
  });

  A['__state_api_esm_v1'] = true;
}
