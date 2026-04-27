import type { AppContainer } from '../../../types';

import { reportSceneViewNonFatal, triggerSceneViewRender } from './scene_view_shared.js';
import { updateLightsInternal, updateSceneModeInternal } from './scene_view_lighting_runtime.js';

export { initLights } from './scene_view_lighting_runtime.js';

export function updateLights(App: AppContainer, updateShadows?: boolean): void {
  updateLightsInternal(App, { updateShadows: !!updateShadows, triggerRender: true });
}

export function updateSceneMode(App: AppContainer): void {
  updateSceneModeInternal(App, { triggerRender: true });
}

export function applyViewMode(App: AppContainer, updateShadows?: boolean): void {
  let updatedSceneMode = false;
  let updatedLights = false;

  try {
    updatedSceneMode = updateSceneModeInternal(App, { triggerRender: false });
  } catch (err) {
    reportSceneViewNonFatal('sceneView.lighting.applyViewMode', err);
  }
  try {
    updatedLights = updateLightsInternal(App, { updateShadows: !!updateShadows, triggerRender: false });
  } catch (err) {
    reportSceneViewNonFatal('sceneView.lighting.applyViewMode.triggerRender', err);
  }

  if (updatedSceneMode || updatedLights) triggerSceneViewRender(App);
}
