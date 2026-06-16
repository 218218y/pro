import type { AppContainer } from '../../../types';

import {
  getRenderer,
  readRendererLightingDefaults,
  writeRendererLightingDefaults,
} from '../runtime/render_access.js';
import {
  asRendererLightingDefaults,
  asSceneRendererLightingSurface,
  asSceneThreeLighting,
  getTHREE,
  reportSceneViewNonFatal,
  type SceneViewRendererLightingDefaults,
} from './scene_view_shared.js';
import { NORMAL_EXPOSURE } from './scene_view_lighting_shared.js';

type RendererLightingSurface = NonNullable<ReturnType<typeof asSceneRendererLightingSurface>>;

function restoreRendererLightingDefaults(App: AppContainer, rendererSurface: RendererLightingSurface): void {
  const defaults = asRendererLightingDefaults(readRendererLightingDefaults(App));
  if (!rendererSurface || !defaults) return;

  if (typeof defaults.outputColorSpace !== 'undefined') {
    try {
      rendererSurface.outputColorSpace = defaults.outputColorSpace;
    } catch (err) {
      reportSceneViewNonFatal(
        App,
        'sceneView.lighting.restoreRendererLightingDefaults.outputColorSpace',
        err
      );
    }
  }
  if (typeof defaults.toneMapping !== 'undefined') {
    try {
      rendererSurface.toneMapping = defaults.toneMapping;
    } catch (err) {
      reportSceneViewNonFatal(App, 'sceneView.lighting.restoreRendererLightingDefaults.toneMapping', err);
    }
  }
  if (typeof defaults.toneMappingExposure === 'number') {
    try {
      rendererSurface.toneMappingExposure = defaults.toneMappingExposure;
    } catch (err) {
      reportSceneViewNonFatal(
        App,
        'sceneView.lighting.restoreRendererLightingDefaults.toneMappingExposure',
        err
      );
    }
  }
}

export function ensureRendererLightingDefaults(
  App: AppContainer,
  rendererSurface: RendererLightingSurface
): SceneViewRendererLightingDefaults | undefined {
  if (!rendererSurface) return undefined;
  let rendererDefaults = readRendererLightingDefaults(App);
  if (!rendererDefaults) {
    rendererDefaults = {
      outputColorSpace: rendererSurface.outputColorSpace,
      toneMapping: rendererSurface.toneMapping,
      toneMappingExposure: rendererSurface.toneMappingExposure,
    } satisfies SceneViewRendererLightingDefaults;
    writeRendererLightingDefaults(App, rendererDefaults);
  }
  return rendererDefaults;
}

function applyNormalModeRendererLighting(App: AppContainer, rendererSurface: RendererLightingSurface): void {
  if (!rendererSurface) return;
  const THREE = asSceneThreeLighting(getTHREE(App));
  if (THREE && 'outputColorSpace' in rendererSurface) {
    try {
      rendererSurface.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
      reportSceneViewNonFatal(App, 'sceneView.lighting.applyNormalRendererLighting.outputColorSpace', err);
    }
  }
  if (THREE && 'toneMapping' in rendererSurface) {
    try {
      rendererSurface.toneMapping = THREE.NeutralToneMapping;
    } catch (err) {
      reportSceneViewNonFatal(App, 'sceneView.lighting.applyNormalRendererLighting.toneMapping', err);
    }
  }
  if ('toneMappingExposure' in rendererSurface) {
    try {
      rendererSurface.toneMappingExposure = NORMAL_EXPOSURE;
    } catch (err) {
      reportSceneViewNonFatal(App, 'sceneView.lighting.applyNormalRendererLighting.toneMappingExposure', err);
    }
  }
}

export function applyRendererLightingMode(App: AppContainer, sketchMode: boolean): void {
  try {
    const rendererSurface = asSceneRendererLightingSurface(getRenderer(App));
    if (!rendererSurface) return;
    ensureRendererLightingDefaults(App, rendererSurface);
    if (sketchMode) restoreRendererLightingDefaults(App, rendererSurface);
    else applyNormalModeRendererLighting(App, rendererSurface);
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.lighting.applyRendererLightingMode', err);
  }
}
