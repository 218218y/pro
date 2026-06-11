import type { AppContainer } from '../../../types';

import { getAutoLightBuildKey, setAutoLightBuildKey } from '../runtime/render_access.js';
import { refreshSceneRuntimeLights, syncSceneRuntimeFromStore } from './scene_runtime.js';
import { getBuildReactionsCornerKey, getBuildReactionsUiSnapshot } from './build_reactions_shared.js';

export function updateLightsAfterBuild(App: AppContainer): void {
  const ui = getBuildReactionsUiSnapshot(App);
  const key = getBuildReactionsCornerKey(ui);

  const last = getAutoLightBuildKey(App);
  const changed = key !== last;
  setAutoLightBuildKey(App, key);

  if (
    syncSceneRuntimeFromStore(App, {
      updateShadows: !!changed,
      force: true,
      reason: 'buildReactions:afterBuild',
    })
  ) {
    return;
  }
  refreshSceneRuntimeLights(App, !!changed);
}
