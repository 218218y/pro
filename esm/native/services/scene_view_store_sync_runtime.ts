import type { AppContainer, SceneViewSyncOptsLike } from '../../../types';

import { applyViewMode, updateLights, updateSceneMode } from './scene_view_lighting.js';
import { getStoreSelectorSubscriber } from '../runtime/store_surface_access.js';
import { getStoreSyncState, readSceneViewSyncSnapshot } from './scene_view_shared.js';
import {
  areSceneViewLightValuesEqual,
  areSceneViewModeValuesEqual,
  didLightInputsChange,
  didSceneModeChange,
  didShadowRelevantLightChange,
  selectSceneViewLightsValue,
  selectSceneViewModeValue,
  type SceneViewLightsSelectorValue,
} from './scene_view_store_sync_selectors.js';

export function syncSceneViewFromStore(App: AppContainer, opts?: SceneViewSyncOptsLike): void {
  const syncState = getStoreSyncState(App);
  if (syncState.flushPending) {
    syncState.flushPending = false;
    syncState.queuedUpdateShadows = false;
    syncState.queuedForce = false;
    syncState.queuedReason = null;
    syncState.flushToken += 1;
  }

  const prev = syncState.lastSnapshot;
  const next = readSceneViewSyncSnapshot(App);
  syncState.lastSnapshot = next;

  const force = !!opts?.force;
  const shouldSyncSceneMode = force || didSceneModeChange(prev, next);
  const shouldSyncLights = force || didLightInputsChange(prev, next);
  const shouldUpdateShadows = !!opts?.updateShadows || force || didShadowRelevantLightChange(prev, next);

  if (shouldSyncSceneMode && shouldSyncLights) {
    applyViewMode(App, shouldUpdateShadows);
    return;
  }

  if (shouldSyncSceneMode) updateSceneMode(App);
  if (shouldSyncLights) updateLights(App, shouldUpdateShadows);
}

export function scheduleSceneViewSyncFromStore(App: AppContainer, opts?: SceneViewSyncOptsLike): void {
  const syncState = getStoreSyncState(App);
  if (opts?.updateShadows) syncState.queuedUpdateShadows = true;
  if (opts?.force) syncState.queuedForce = true;
  if (typeof opts?.reason === 'string' && opts.reason.trim()) syncState.queuedReason = opts.reason.trim();
  if (syncState.flushPending) return;

  syncState.flushPending = true;
  const token = ++syncState.flushToken;
  Promise.resolve().then(() => {
    if (syncState.flushToken !== token) return;

    syncState.flushPending = false;
    const updateShadows = !!syncState.queuedUpdateShadows;
    const force = !!syncState.queuedForce;
    const reason = syncState.queuedReason || 'sceneView:scheduledSync';
    syncState.queuedUpdateShadows = false;
    syncState.queuedForce = false;
    syncState.queuedReason = null;

    syncSceneViewFromStore(App, { updateShadows, force, reason });
  });
}

function resetSceneViewStoreSyncState(syncState: ReturnType<typeof getStoreSyncState>): void {
  syncState.installed = false;
  syncState.unsub = null;
  syncState.modeUnsub = null;
  syncState.lightsUnsub = null;
  syncState.flushPending = false;
  syncState.queuedUpdateShadows = false;
  syncState.queuedForce = false;
  syncState.queuedReason = null;
  syncState.flushToken += 1;
  syncState.lastSnapshot = null;
}

function disposeSceneViewStoreSyncListeners(syncState: ReturnType<typeof getStoreSyncState>): void {
  const modeUnsub = syncState.modeUnsub;
  const lightsUnsub = syncState.lightsUnsub;
  resetSceneViewStoreSyncState(syncState);
  if (typeof modeUnsub === 'function') modeUnsub();
  if (typeof lightsUnsub === 'function') lightsUnsub();
}

function createSceneViewStoreSyncDisposer(syncState: ReturnType<typeof getStoreSyncState>): () => void {
  return () => {
    disposeSceneViewStoreSyncListeners(syncState);
  };
}

export function installSceneViewStoreSync(App: AppContainer): boolean {
  const syncState = getStoreSyncState(App);
  const hasModeSubscription = typeof syncState.modeUnsub === 'function';
  const hasLightsSubscription = typeof syncState.lightsUnsub === 'function';
  if (syncState.installed && hasModeSubscription && hasLightsSubscription) {
    if (typeof syncState.unsub !== 'function') {
      syncState.unsub = createSceneViewStoreSyncDisposer(syncState);
    }
    return true;
  }

  if (hasModeSubscription || hasLightsSubscription || typeof syncState.unsub === 'function') {
    disposeSceneViewStoreSyncListeners(syncState);
  } else {
    resetSceneViewStoreSyncState(syncState);
  }

  const subscribeSelector = getStoreSelectorSubscriber(App);
  if (!subscribeSelector) {
    throw new Error('[WardrobePro][sceneView] Missing store.subscribeSelector');
  }

  const modeUnsub = subscribeSelector(
    selectSceneViewModeValue,
    () => {
      scheduleSceneViewSyncFromStore(App, { reason: 'sceneView:store.modeChange' });
    },
    { equalityFn: areSceneViewModeValuesEqual }
  );

  const lightsUnsub = subscribeSelector(
    selectSceneViewLightsValue,
    (next: SceneViewLightsSelectorValue, previous: SceneViewLightsSelectorValue) => {
      const shouldUpdateShadows = didShadowRelevantLightChange(previous, next);
      scheduleSceneViewSyncFromStore(App, {
        updateShadows: shouldUpdateShadows,
        reason: 'sceneView:store.lightInputsChange',
      });
    },
    { equalityFn: areSceneViewLightValuesEqual }
  );

  syncState.installed = true;
  syncState.modeUnsub = typeof modeUnsub === 'function' ? modeUnsub : null;
  syncState.lightsUnsub = typeof lightsUnsub === 'function' ? lightsUnsub : null;
  syncState.unsub = createSceneViewStoreSyncDisposer(syncState);
  syncState.lastSnapshot = readSceneViewSyncSnapshot(App);
  syncSceneViewFromStore(App, { force: true, updateShadows: true, reason: 'sceneView:installStoreSync' });
  return true;
}

export function disposeSceneViewStoreSync(App: AppContainer): void {
  const syncState = getStoreSyncState(App);
  disposeSceneViewStoreSyncListeners(syncState);
}
