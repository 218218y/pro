import type { AppContainer } from '../../../types';

import { getCfg as __getCfgStore } from '../kernel/api.js';
import { setCfgManualWidth, setCfgWardrobeType } from '../runtime/cfg_access.js';
import { metaMerge, metaRestore } from '../runtime/meta_profiles_access.js';

import { type AppLike, getCfgSafe, getRoomActions, isRecord } from './boot_seeds_part02_shared.js';

function readCfgStore(App: AppContainer) {
  return __getCfgStore(App);
}

function cfgMeta(App: AppLike, meta: Record<string, unknown> | null | undefined) {
  const m = isRecord(meta) ? { ...meta } : {};
  if (!m.source) m.source = 'boot:seed';
  try {
    return metaMerge(App, m, undefined, undefined);
  } catch (_) {
    return m;
  }
}

function cfgMetaRestoreProfile(
  App: AppLike,
  meta: Record<string, unknown> | null | undefined,
  source: string
) {
  const m = isRecord(meta) ? { ...meta } : {};
  if (!m.source) m.source = source;
  try {
    return metaRestore(App, m, source);
  } catch (_) {
    return cfgMeta(App, m);
  }
}

export function seedWardrobeType(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const cfg0 = getCfgSafe(App, readCfgStore);
  if (typeof cfg0.wardrobeType !== 'undefined') return;

  const meta = cfgMetaRestoreProfile(App, null, 'boot:defaultWardrobeType');
  try {
    const room = getRoomActions(App);
    if (room && typeof room.setWardrobeType === 'function') {
      room.setWardrobeType('hinged', meta);
      return;
    }
  } catch (_) {}

  try {
    setCfgWardrobeType(App, 'hinged', meta);
  } catch (_) {}
}

export function seedManualWidthFlag(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const cfg0 = getCfgSafe(App, readCfgStore);
  if (typeof cfg0.isManualWidth !== 'undefined') return;

  const meta = cfgMetaRestoreProfile(App, null, 'boot:defaultManualWidth');
  try {
    const room = getRoomActions(App);
    if (room && typeof room.setManualWidth === 'function') {
      room.setManualWidth(false, meta);
      return;
    }
  } catch (_) {}

  try {
    setCfgManualWidth(App, false, meta);
  } catch (_) {}
}
