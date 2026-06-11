import type { AppContainer } from '../../../types';

import { getRenderSlot, getShadowMap, setRenderSlot } from '../runtime/render_access.js';
import { reportSceneViewNonFatal } from './scene_view_shared.js';

export const NORMAL_EXPOSURE = 1.5;
export const NORMAL_AMBIENT_DEFAULT = 0.7;
export const NORMAL_DIR_DEFAULT = 1.45;

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
    reportSceneViewNonFatal('sceneView.lighting.updateCornerAutoLightShadowRefresh', err);
  }
}
