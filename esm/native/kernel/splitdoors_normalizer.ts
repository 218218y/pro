// Native ESM conversion (TypeScript)
// Converted from legacy: js/kernel/pro_splitdoors_normalizer.js
// Stage 117 - kernel native

import type { AppContainer, UnknownRecord } from '../../../types';

import { ensurePlatformUtil } from '../runtime/platform_access.js';

function normalizeSplitMapValue(v: unknown): unknown {
  if (v === 'false' || v === '0' || v === 0) return false;
  if (v === 'true' || v === '1' || v === 1) return true;
  return v;
}

function parseDoorsCount(doorsCount?: number): number | null {
  if (typeof doorsCount === 'number' && Number.isFinite(doorsCount)) return Math.trunc(doorsCount);
  return null;
}

export function installSplitDoorsNormalizers(App: AppContainer): void {
  if (!App || typeof App !== 'object') return;
  const util = ensurePlatformUtil(App);

  function normalizeSplitDoorsMap(map: UnknownRecord): UnknownRecord {
    if (!map || typeof map !== 'object') return {};
    const out: UnknownRecord = {};
    const entries = Object.entries(map);
    for (let i = 0; i < entries.length; i++) {
      const rawKey = entries[i][0];
      const v = entries[i][1];

      let key = String(rawKey);
      if (key.indexOf('split_split_') === 0) key = 'split_' + key.slice('split_split_'.length);

      let inner = key;
      if (inner.indexOf('split_') === 0) inner = inner.slice(6);

      if (/^\d+$/.test(inner)) inner = 'd' + inner;
      else {
        const m = inner.match(/^door[_-]?(\d+)$/i);
        if (m) inner = 'd' + m[1];
        const m2 = inner.match(/^(\d+)(_(full|top|bot))$/i);
        if (m2) inner = 'd' + m2[1] + m2[2];
      }

      key = 'split_' + inner;
      key = key.replace(/^split_(d\d+)_(full|top|bot)$/i, 'split_$1');
      out[key] = normalizeSplitMapValue(v);
    }
    return out;
  }

  function normalizeSplitDoorsMapWithDoors(map: UnknownRecord, doorsCount?: number): UnknownRecord {
    const norm = normalizeSplitDoorsMap(map);

    const dc = parseDoorsCount(doorsCount);
    if (!dc || dc <= 0) return norm;

    let hasFalse = false;
    let hasTrue = false;
    const keys = Object.keys(norm || {});
    for (let i = 0; i < keys.length; i++) {
      const v = norm[keys[i]];
      if (v === false) hasFalse = true;
      else if (v === true) hasTrue = true;
    }

    if (hasFalse) return norm;

    if (hasTrue) {
      const out: UnknownRecord = {};
      for (let d = 1; d <= dc; d++) {
        out['split_d' + d] = false;
      }
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        if (norm[k] === true) delete out[k];
      }
      return out;
    }

    return norm;
  }

  util.normalizeSplitDoorsMap = util.normalizeSplitDoorsMap || normalizeSplitDoorsMap;
  util.normalizeSplitDoorsMapWithDoors =
    util.normalizeSplitDoorsMapWithDoors || normalizeSplitDoorsMapWithDoors;
}
