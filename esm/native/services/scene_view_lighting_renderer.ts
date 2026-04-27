import type { AppContainer } from '../../../types';

import {
  getRenderer,
  readRendererCompatDefaults,
  writeRendererCompatDefaults,
} from '../runtime/render_access.js';
import {
  asCompatDefaults,
  asSceneRendererCompat,
  asSceneThreeLighting,
  getTHREE,
  reportSceneViewNonFatal,
  type SceneViewCompatDefaults,
} from './scene_view_shared.js';
import { NORMAL_EXPOSURE } from './scene_view_lighting_shared.js';

function restoreRendererCompatDefaults(
  App: AppContainer,
  rendererCompat: ReturnType<typeof asSceneRendererCompat>
): void {
  const defaults = asCompatDefaults(readRendererCompatDefaults(App));
  if (!rendererCompat || !defaults) return;

  if (typeof defaults.outputColorSpace !== 'undefined') {
    try {
      rendererCompat.outputColorSpace = defaults.outputColorSpace;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.restoreRendererCompat.outputColorSpace', err);
    }
  }
  if (typeof defaults.toneMapping !== 'undefined') {
    try {
      rendererCompat.toneMapping = defaults.toneMapping;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.restoreRendererCompat.toneMapping', err);
    }
  }
  if (typeof defaults.toneMappingExposure === 'number') {
    try {
      rendererCompat.toneMappingExposure = defaults.toneMappingExposure;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.restoreRendererCompat.toneMappingExposure', err);
    }
  }
  if (typeof defaults.useLegacyLights === 'boolean' && typeof rendererCompat.useLegacyLights === 'boolean') {
    try {
      rendererCompat.useLegacyLights = defaults.useLegacyLights;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.restoreRendererCompat.useLegacyLights', err);
    }
  }
}

export function ensureRendererCompatDefaults(
  App: AppContainer,
  rendererCompat: ReturnType<typeof asSceneRendererCompat>
): SceneViewCompatDefaults | undefined {
  if (!rendererCompat) return undefined;
  let compatDefaults = readRendererCompatDefaults(App);
  if (!compatDefaults) {
    compatDefaults = {
      outputColorSpace: rendererCompat.outputColorSpace,
      toneMapping: rendererCompat.toneMapping,
      toneMappingExposure: rendererCompat.toneMappingExposure,
      useLegacyLights:
        typeof rendererCompat.useLegacyLights === 'boolean' ? rendererCompat.useLegacyLights : undefined,
    } satisfies SceneViewCompatDefaults;
    writeRendererCompatDefaults(App, compatDefaults);
  }
  return compatDefaults;
}

function applyNormalModeRendererCompat(
  App: AppContainer,
  rendererCompat: ReturnType<typeof asSceneRendererCompat>
): void {
  if (!rendererCompat) return;
  const THREE = asSceneThreeLighting(getTHREE(App));
  if (THREE && 'outputColorSpace' in rendererCompat) {
    try {
      rendererCompat.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.applyNormalRendererCompat.outputColorSpace', err);
    }
  }
  if (THREE && 'toneMapping' in rendererCompat) {
    try {
      rendererCompat.toneMapping = THREE.NeutralToneMapping;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.applyNormalRendererCompat.toneMapping', err);
    }
  }
  if ('toneMappingExposure' in rendererCompat) {
    try {
      rendererCompat.toneMappingExposure = NORMAL_EXPOSURE;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.applyNormalRendererCompat.toneMappingExposure', err);
    }
  }
  if (typeof rendererCompat.useLegacyLights === 'boolean') {
    try {
      rendererCompat.useLegacyLights = true;
    } catch (err) {
      reportSceneViewNonFatal('sceneView.lighting.applyNormalRendererCompat.useLegacyLights', err);
    }
  }
}

export function applyRendererCompatibility(App: AppContainer, sketchMode: boolean): void {
  try {
    const rendererCompat = asSceneRendererCompat(getRenderer(App));
    if (!rendererCompat) return;
    ensureRendererCompatDefaults(App, rendererCompat);
    if (sketchMode) restoreRendererCompatDefaults(App, rendererCompat);
    else applyNormalModeRendererCompat(App, rendererCompat);
  } catch (err) {
    reportSceneViewNonFatal('sceneView.lighting.applyRendererCompatibility', err);
  }
}
