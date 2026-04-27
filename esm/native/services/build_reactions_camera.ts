import type { AppContainer } from '../../../types';

import { getAutoCameraBuildKey, setAutoCameraBuildKey } from '../runtime/render_access.js';
import { adjustCameraForChest, adjustCameraForCorner, resetCameraPreset } from './camera_presets.js';
import { getBuildReactionsCameraKey, getBuildReactionsUiSnapshot } from './build_reactions_shared.js';

export function updateCameraAfterBuild(App: AppContainer): void {
  const ui = getBuildReactionsUiSnapshot(App);
  const key = getBuildReactionsCameraKey(ui);

  const last = getAutoCameraBuildKey(App);
  const changed = key !== last;
  setAutoCameraBuildKey(App, key);

  if (!changed) return;

  if (key === 'chest') {
    adjustCameraForChest(App);
    return;
  }

  if (key === 'normal') {
    resetCameraPreset(App);
    return;
  }

  const side: 'left' | 'right' = key === 'corner:left' ? 'left' : 'right';
  adjustCameraForCorner(App, side);
}
