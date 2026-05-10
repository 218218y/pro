import type { AppContainer, SceneNamespaceLike, SceneViewSyncOptsLike } from '../../../types';

import {
  initLights,
  installSceneViewService,
  installSceneViewStoreSync,
  syncSceneViewFromStore,
  updateLights,
  updateSceneMode,
} from './scene_view.js';
import { reportSceneViewNonFatal } from './scene_view_shared.js';
import { getServiceSlotMaybe } from '../runtime/services_root_access.js';

type SceneViewMethodMap = {
  initLights: NonNullable<SceneNamespaceLike['initLights']>;
  installStoreSync: NonNullable<SceneNamespaceLike['installStoreSync']>;
  syncFromStore: NonNullable<SceneNamespaceLike['syncFromStore']>;
  updateLights: NonNullable<SceneNamespaceLike['updateLights']>;
  updateSceneMode: NonNullable<SceneNamespaceLike['updateSceneMode']>;
};

type SceneViewMethodKey = keyof SceneViewMethodMap;

function isSceneViewMethod<K extends SceneViewMethodKey>(value: unknown): value is SceneViewMethodMap[K] {
  return typeof value === 'function';
}

function isSceneViewService(value: unknown): value is SceneNamespaceLike {
  return !!value && typeof value === 'object';
}

function readSceneViewService(value: unknown): SceneNamespaceLike | null {
  return isSceneViewService(value) ? value : null;
}

function reportSceneViewAccessNonFatal(App: AppContainer, op: string, err: unknown): void {
  reportSceneViewNonFatal(App, `sceneView.access.${op}`, err);
}

function getSceneViewMethod<K extends SceneViewMethodKey>(
  App: AppContainer,
  key: K
): SceneViewMethodMap[K] | null {
  try {
    const ensured = ensureSceneViewService(App);
    const method = ensured[key];
    if (isSceneViewMethod<K>(method)) return method;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, `${String(key)}.ensureService`, err);
  }

  try {
    const existing = getSceneViewServiceMaybe(App);
    const method = existing?.[key];
    if (isSceneViewMethod<K>(method)) return method;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, `${String(key)}.readExistingService`, err);
  }

  return null;
}

export function getSceneViewServiceMaybe(App: unknown): SceneNamespaceLike | null {
  try {
    return readSceneViewService(getServiceSlotMaybe(App, 'sceneView'));
  } catch {
    return null;
  }
}

export function ensureSceneViewService(App: AppContainer): SceneNamespaceLike {
  return installSceneViewService(App);
}

export function initSceneLightsViaService(App: AppContainer): boolean {
  try {
    const run = getSceneViewMethod(App, 'initLights');
    if (typeof run === 'function') {
      run();
      return true;
    }
    initLights(App);
    return true;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, 'initLights.ownerRejected', err);
    return false;
  }
}

export function installSceneViewStoreSyncViaService(App: AppContainer): boolean {
  try {
    const install = getSceneViewMethod(App, 'installStoreSync');
    if (typeof install === 'function' && install()) return true;
    return !!installSceneViewStoreSync(App);
  } catch (err) {
    reportSceneViewAccessNonFatal(App, 'installStoreSync.ownerRejected', err);
    return false;
  }
}

export function syncSceneViewViaService(App: AppContainer, opts?: SceneViewSyncOptsLike): boolean {
  try {
    const sync = getSceneViewMethod(App, 'syncFromStore');
    if (typeof sync === 'function') {
      sync(opts);
      return true;
    }
    syncSceneViewFromStore(App, opts);
    return true;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, 'syncFromStore.ownerRejected', err);
    return false;
  }
}

export function updateSceneLightsViaService(App: AppContainer, updateShadows?: boolean): boolean {
  try {
    const run = getSceneViewMethod(App, 'updateLights');
    if (typeof run === 'function') {
      run(!!updateShadows);
      return true;
    }
    updateLights(App, !!updateShadows);
    return true;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, 'updateLights.ownerRejected', err);
    return false;
  }
}

export function updateSceneModeViaService(App: AppContainer): boolean {
  try {
    const run = getSceneViewMethod(App, 'updateSceneMode');
    if (typeof run === 'function') {
      run();
      return true;
    }
    updateSceneMode(App);
    return true;
  } catch (err) {
    reportSceneViewAccessNonFatal(App, 'updateSceneMode.ownerRejected', err);
    return false;
  }
}
