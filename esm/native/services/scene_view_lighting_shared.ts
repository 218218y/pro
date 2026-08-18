import type { AppContainer } from '../../../types';

import { getRenderSlot, getShadowMap, setRenderSlot } from '../runtime/render_access.js';
import { reportSceneViewNonFatal } from './scene_view_shared.js';
import {
  VIEWPORT_DIRECTIONAL_SHADOW_PRESET,
  VIEWPORT_NORMAL_EXPOSURE,
  VIEWPORT_NORMAL_LIGHTING_PRESET,
  VIEWPORT_SKETCH_AMBIENT_INTENSITY,
} from '../../shared/visual_lighting_tokens.js';

export const NORMAL_EXPOSURE = VIEWPORT_NORMAL_EXPOSURE;
export const NORMAL_AMBIENT_DEFAULT = VIEWPORT_NORMAL_LIGHTING_PRESET.amb;
export const NORMAL_DIR_DEFAULT = VIEWPORT_NORMAL_LIGHTING_PRESET.dir;
export const SKETCH_AMBIENT_DEFAULT = VIEWPORT_SKETCH_AMBIENT_INTENSITY;
export { VIEWPORT_DIRECTIONAL_SHADOW_PRESET };

export type SceneViewUpdateLightsOpts = {
  updateShadows?: boolean;
  triggerRender?: boolean;
};

export type SceneViewUpdateModeOpts = {
  triggerRender?: boolean;
};

export function updateCornerAutoLightShadowRefresh(
  App: AppContainer,
  cornerMode: boolean,
  cornerSide: 'left' | 'right' | null
): void {
  try {
    const key = cornerMode ? `corner:${cornerSide || 'unknown'}` : 'normal';
    const last = getRenderSlot<string>(App, '__wpAutoLightKey');
    if (key !== last) {
      setRenderSlot(App, '__wpAutoLightKey', key);
      const shadowMap = getShadowMap(App);
      if (shadowMap && shadowMap.autoUpdate === false) shadowMap.needsUpdate = true;
    }
  } catch (err) {
    reportSceneViewNonFatal(App, 'sceneView.lighting.updateCornerAutoLightShadowRefresh', err);
  }
}
