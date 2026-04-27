import type { UnknownRecord } from '../../../types';

import { getBootFlags } from '../runtime/internal_state.js';

import type { AppLike } from './boot_seeds_part02_shared.js';
import { getCfgSafe, seedInternalGridMap } from './boot_seeds_part02_shared.js';
import { seedMultiColorMode, seedSavedColors, seedColorSwatchesOrder } from './boot_seeds_part02_colors.js';
import { seedWardrobeType, seedManualWidthFlag } from './boot_seeds_part02_flags.js';
import { getCfg as readCfgStore } from '../kernel/api.js';
import { getInternalGridMap } from '../runtime/cache_access.js';

function hasBootSeedsPart02Contract(App: AppLike): boolean {
  try {
    const cfg = getCfgSafe(App, readCfgStore as never);
    const hasConfigSeeds = !!(
      cfg &&
      typeof cfg.isMultiColorMode === 'boolean' &&
      Array.isArray(cfg.savedColors) &&
      Array.isArray(cfg.colorSwatchesOrder) &&
      typeof cfg.wardrobeType !== 'undefined' &&
      typeof cfg.isManualWidth !== 'undefined'
    );
    if (!hasConfigSeeds) return false;

    const gridMap = getInternalGridMap(App, false);
    return !!gridMap && typeof gridMap === 'object' && !Array.isArray(gridMap);
  } catch (_) {
    return false;
  }
}

export function applyBootSeedsPart02(App: AppLike): void {
  seedInternalGridMap(App);
  seedMultiColorMode(App);
  seedSavedColors(App);
  seedColorSwatchesOrder(App);
  seedWardrobeType(App);
  seedManualWidthFlag(App);
}

export function installBootSeedsPart02(App: AppLike): UnknownRecord {
  if (!App || typeof App !== 'object') throw new Error('installBootSeedsPart02(App): App is required');

  const boot = getBootFlags(App);
  if (!hasBootSeedsPart02Contract(App)) applyBootSeedsPart02(App);

  boot.bootSeedsPart02Installed = hasBootSeedsPart02Contract(App);
  return boot;
}
