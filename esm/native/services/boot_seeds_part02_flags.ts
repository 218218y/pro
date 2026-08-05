import type { AppContainer } from '../../../types';

import { getCfg as __getCfgStore } from '../kernel/api.js';
import { setCfgManualWidth, setCfgWardrobeType } from '../runtime/cfg_access.js';

import {
  type AppLike,
  createBootSeedRestoreMeta,
  getCfgSafe,
  getRoomActions,
  reportBootSeedNonFatal,
} from './boot_seeds_part02_shared.js';

function readCfgStore(App: AppContainer) {
  return __getCfgStore(App);
}

export function seedWardrobeType(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const cfg0 = getCfgSafe(App, readCfgStore, 'flags.wardrobeType.config.read');
  if (typeof cfg0.wardrobeType !== 'undefined') return;

  const meta = createBootSeedRestoreMeta(App, null, 'boot:defaultWardrobeType');
  try {
    const room = getRoomActions(App);
    if (room && typeof room.setWardrobeType === 'function') {
      room.setWardrobeType('hinged', meta);
      return;
    }
  } catch (error) {
    reportBootSeedNonFatal(App, 'flags.setWardrobeType.action', error);
  }

  try {
    setCfgWardrobeType(App, 'hinged', meta);
  } catch (error) {
    reportBootSeedNonFatal(App, 'flags.setWardrobeType.configWriter', error, true);
  }
}

export function seedManualWidthFlag(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const cfg0 = getCfgSafe(App, readCfgStore, 'flags.manualWidth.config.read');
  if (typeof cfg0.isManualWidth !== 'undefined') return;

  const meta = createBootSeedRestoreMeta(App, null, 'boot:defaultManualWidth');
  try {
    const room = getRoomActions(App);
    if (room && typeof room.setManualWidth === 'function') {
      room.setManualWidth(false, meta);
      return;
    }
  } catch (error) {
    reportBootSeedNonFatal(App, 'flags.setManualWidth.action', error);
  }

  try {
    setCfgManualWidth(App, false, meta);
  } catch (error) {
    reportBootSeedNonFatal(App, 'flags.setManualWidth.configWriter', error, true);
  }
}
