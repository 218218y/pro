import type { AppContainer, SceneNamespaceLike, ThreeLike, UiSnapshotLike } from '../../../types';

import { readRootStateFromStore } from '../runtime/root_state_access.js';
import { getServiceSlotMaybe } from '../runtime/services_root_access.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { readRuntimeScalarOrDefaultFromStore } from '../runtime/runtime_selectors.js';
import {
  asSceneNamespace,
  asSceneViewService,
  asUiSnapshot,
  readRootStateWithStoreUi,
  reportSceneViewNonFatal,
  type SceneViewStoreSyncState,
} from './scene_view_shared_contracts.js';

function getStoreMaybe(App: AppContainer): unknown {
  return getStoreSurfaceMaybe(App);
}

export function getUiSnapshot(App: AppContainer): UiSnapshotLike {
  try {
    const st = readRootStateWithStoreUi(readRootStateFromStore(getStoreMaybe(App)));
    const ui = st?.ui ?? st?.storeUi;
    return asUiSnapshot(ui);
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.shared.getUiSnapshot', err);
  }
  return {};
}

export function getSketchMode(App: AppContainer, _ui: UiSnapshotLike): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromStore(getStoreMaybe(App), 'sketchMode', false);
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.shared.getSketchMode', err);
    return false;
  }
}

export function getTHREE(App: AppContainer): ThreeLike | null {
  return getThreeMaybe(App);
}

export function triggerSceneViewRender(App: AppContainer): void {
  try {
    runPlatformActivityRenderTouch(App, {
      updateShadows: false,
      touchActivity: false,
    });
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.triggerRender', err);
  }
}

export function getSceneViewService(App: AppContainer): SceneNamespaceLike | null {
  try {
    return asSceneNamespace(getServiceSlotMaybe<SceneNamespaceLike>(App, 'sceneView'));
  } catch {
    return null;
  }
}

export function getStoreSyncState(App: AppContainer): SceneViewStoreSyncState {
  const svc = asSceneViewService(getSceneViewService(App));
  const cur = svc?.__storeSyncState;
  if (cur && typeof cur === 'object') return cur;
  const next: SceneViewStoreSyncState = {
    installed: false,
    unsub: null,
    modeUnsub: null,
    lightsUnsub: null,
    lastSnapshot: null,
    flushPending: false,
    queuedUpdateShadows: false,
    queuedForce: false,
    queuedReason: null,
    flushToken: 0,
  };
  if (svc) svc.__storeSyncState = next;
  return next;
}
