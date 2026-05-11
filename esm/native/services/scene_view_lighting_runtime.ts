import type { AppContainer, UiSnapshotLike } from '../../../types';

import {
  getAmbientLight,
  getDirectionalLight,
  getRoomGroup,
  getScene,
  getShadowMap,
  setAmbientLight,
  setDirectionalLight,
} from '../runtime/render_access.js';
import {
  asAmbientLight,
  asDirectionalLight,
  asFiniteNumber,
  asSceneGraph,
  asSceneThreeLighting,
  getCornerLighting,
  getSketchMode,
  getTHREE,
  getUiSnapshot,
  reportSceneViewNonFatal,
  triggerSceneViewRender,
} from './scene_view_shared.js';
import {
  NORMAL_AMBIENT_DEFAULT,
  NORMAL_DIR_DEFAULT,
  type SceneViewUpdateLightsOpts,
  type SceneViewUpdateModeOpts,
  updateCornerAutoLightShadowRefresh,
} from './scene_view_lighting_shared.js';
import { applyRendererLightingMode } from './scene_view_lighting_renderer.js';

function applyLightingControlUi(App: AppContainer, ui: UiSnapshotLike): void {
  const ambient = asAmbientLight(getAmbientLight(App));
  const directional = asDirectionalLight(getDirectionalLight(App));
  if (!ambient || !directional) return;

  const ambientValue = asFiniteNumber(ui.lightAmb);
  const directionalValue = asFiniteNumber(ui.lightDir);
  const lightX = asFiniteNumber(ui.lightX);
  const lightY = asFiniteNumber(ui.lightY);
  const lightZ = asFiniteNumber(ui.lightZ);

  ambient.intensity = ambientValue ?? NORMAL_AMBIENT_DEFAULT;
  directional.intensity = directionalValue ?? NORMAL_DIR_DEFAULT;

  if (directional.position && typeof directional.position.set === 'function') {
    directional.position.set(lightX ?? 5, lightY ?? 8, lightZ ?? 8);
  }

  const { cornerMode, cornerSide } = getCornerLighting(ui);
  updateCornerAutoLightShadowRefresh(App, cornerMode, cornerSide);
}

function applyDefaultLighting(App: AppContainer, ui: UiSnapshotLike): void {
  const ambient = asAmbientLight(getAmbientLight(App));
  const directional = asDirectionalLight(getDirectionalLight(App));
  if (!ambient || !directional) return;

  ambient.intensity = NORMAL_AMBIENT_DEFAULT;
  directional.intensity = NORMAL_DIR_DEFAULT;

  const { cornerMode, cornerSide } = getCornerLighting(ui);
  const baseY = 8;
  const baseZ = 8;
  let baseX = 5;
  if (cornerMode && cornerSide === 'right') baseX = -5;

  if (directional.position && typeof directional.position.set === 'function') {
    directional.position.set(baseX, baseY, baseZ);
  }

  updateCornerAutoLightShadowRefresh(App, cornerMode, cornerSide);
}

export function initLights(App: AppContainer): void {
  try {
    const THREE = asSceneThreeLighting(getTHREE(App));
    if (!THREE) return;

    const scene = asSceneGraph(getScene(App));
    if (!scene || typeof scene.add !== 'function') return;
    if (getAmbientLight(App) && getDirectionalLight(App)) return;

    const ambient = asAmbientLight(
      setAmbientLight(App, new THREE.AmbientLight(0xffffff, NORMAL_AMBIENT_DEFAULT))
    );
    if (!ambient) return;
    ambient.name = 'ambLight';

    const directional = asDirectionalLight(
      setDirectionalLight(App, new THREE.DirectionalLight(0xffffff, NORMAL_DIR_DEFAULT))
    );
    if (!directional) return;
    directional.name = 'dirLight';

    if (directional.position && typeof directional.position.set === 'function') {
      directional.position.set(5, 8, 8);
    }

    directional.castShadow = true;
    if (directional.shadow) {
      directional.shadow.mapSize.width = 1024;
      directional.shadow.mapSize.height = 1024;
      directional.shadow.camera.near = 0.1;
      directional.shadow.camera.far = 50;
      directional.shadow.camera.left = -10;
      directional.shadow.camera.right = 10;
      directional.shadow.camera.top = 10;
      directional.shadow.camera.bottom = -10;
      try {
        directional.shadow.bias = -0.00025;
        directional.shadow.normalBias = 0.02;
        directional.shadow.radius = 2;
      } catch (err) {
        reportSceneViewNonFatal(App, 'sceneView.lighting.initLights.shadowConfig', err);
      }
    }

    scene.add(ambient);
    scene.add(directional);
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.lighting.initLights', err);
  }
}

export function updateLightsInternal(App: AppContainer, opts?: SceneViewUpdateLightsOpts): boolean {
  const doUpdateShadows = !!opts?.updateShadows;
  const shouldTriggerRender = opts?.triggerRender !== false;

  try {
    const ambient = asAmbientLight(getAmbientLight(App));
    const directional = asDirectionalLight(getDirectionalLight(App));
    if (!ambient || !directional) return false;

    const ui = getUiSnapshot(App);
    const sketchMode = getSketchMode(App, ui);
    applyRendererLightingMode(App, sketchMode);

    if (sketchMode) {
      ambient.intensity = 0.95;
      directional.visible = false;
    } else {
      directional.visible = true;
      if (ui?.lightingControl) applyLightingControlUi(App, ui);
      else applyDefaultLighting(App, ui);
    }

    if (doUpdateShadows) {
      const shadowMap = getShadowMap(App);
      if (shadowMap) {
        directional.castShadow = true;
        shadowMap.needsUpdate = true;
      }
    }

    if (shouldTriggerRender) triggerSceneViewRender(App);
    return true;
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.lighting.updateLights', err);
    return false;
  }
}

export function updateSceneModeInternal(App: AppContainer, opts?: SceneViewUpdateModeOpts): boolean {
  const shouldTriggerRender = opts?.triggerRender !== false;

  try {
    const scene = asSceneGraph(getScene(App));
    if (!scene) return false;

    let isVisible = true;
    try {
      isVisible = !getSketchMode(App, getUiSnapshot(App));
    } catch {
      isVisible = true;
    }

    const oldFloor = typeof scene.getObjectByName === 'function' ? scene.getObjectByName('floor') : null;
    if (oldFloor) oldFloor.visible = !!isVisible;

    const roomGroup = asSceneGraph(getRoomGroup(App));
    const smartFloor =
      roomGroup && typeof roomGroup.getObjectByName === 'function'
        ? roomGroup.getObjectByName('smartFloor')
        : typeof scene.getObjectByName === 'function'
          ? scene.getObjectByName('smartFloor')
          : null;
    if (smartFloor) smartFloor.visible = !!isVisible;

    if (shouldTriggerRender) triggerSceneViewRender(App);
    return true;
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.lighting.updateSceneMode.floorVisibility', err);
    return false;
  }
}
