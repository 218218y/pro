import type { ProjectDataLike, UnknownRecord } from '../../../types/index.js';

import { cloneMirrorLayoutList, readMirrorLayoutList } from '../features/mirror_layout.js';

import { asObject } from './project_payload_shared.js';
import {
  canonicalSegmentedDoorKey,
  ensureMapRecord,
  migrateBaseKeysToFull,
} from './project_schema_migrations_shared.js';

export function canonicalizeSegmentedDoorMaps(data: ProjectDataLike): void {
  const hasOwn = Object.prototype.hasOwnProperty;

  const removedSrc = asObject(data.removedDoorsMap);
  const removedOut: Record<string, true> = {};
  for (const rawKey in removedSrc) {
    if (!hasOwn.call(removedSrc, rawKey)) continue;
    if (!removedSrc[rawKey]) continue;
    const bareKey = rawKey.startsWith('removed_') ? rawKey.slice(8) : rawKey;
    const canonicalKey = canonicalSegmentedDoorKey(String(bareKey || ''));
    if (!canonicalKey) continue;
    removedOut['removed_' + canonicalKey] = true;
  }
  data.removedDoorsMap = removedOut;

  migrateBaseKeysToFull(ensureMapRecord(data.individualColors));
  migrateBaseKeysToFull(ensureMapRecord(data.doorSpecialMap));
  migrateBaseKeysToFull(ensureMapRecord(data.curtainMap));
  migrateBaseKeysToFull(ensureMapRecord(data.mirrorLayoutMap));
}

function expandSegmentEntries(map: UnknownRecord): void {
  const hasOwn = Object.prototype.hasOwnProperty;
  const entries = Object.entries(map);
  for (const [key, value] of entries) {
    if (value == null) continue;
    if (!String(key).endsWith('_full')) continue;
    const base = String(key).replace(/_full$/i, '');
    const topKey = base + '_top';
    const botKey = base + '_bot';
    if (!hasOwn.call(map, topKey)) map[topKey] = value;
    if (!hasOwn.call(map, botKey)) map[botKey] = value;
  }
}

export function migrateDoorStylePayloadMaps(data: ProjectDataLike): void {
  try {
    const individualColors = ensureMapRecord(data.individualColors);
    const doorSpecialMap = ensureMapRecord(data.doorSpecialMap);
    const hasOwn = Object.prototype.hasOwnProperty;

    for (const key in individualColors) {
      if (!hasOwn.call(individualColors, key)) continue;
      const value = individualColors[key];
      if (value === 'mirror' || value === 'glass') {
        if (!hasOwn.call(doorSpecialMap, key)) doorSpecialMap[key] = value;
        try {
          delete individualColors[key];
        } catch {
          individualColors[key] = undefined;
        }
      }
    }

    const curtainMap = ensureMapRecord(data.curtainMap);
    for (const partId in curtainMap) {
      if (!hasOwn.call(curtainMap, partId)) continue;
      const value = curtainMap[partId];
      if (!value || value === 'none') continue;
      if (partId && !hasOwn.call(doorSpecialMap, partId)) doorSpecialMap[partId] = 'glass';
    }

    const specialEntries = Object.entries(doorSpecialMap);
    for (const [key, value] of specialEntries) {
      if (value !== 'mirror' && value !== 'glass') continue;
      const base = String(key).replace(/_(full|top|mid|bot)$/i, '');
      const isBase = base === key;
      const isFull = String(key).endsWith('_full');
      if (!isBase && !isFull) continue;
      const fullKey = isFull ? String(key) : base + '_full';
      if (!hasOwn.call(doorSpecialMap, fullKey)) doorSpecialMap[fullKey] = value;
      const topKey = base + '_top';
      const botKey = base + '_bot';
      if (!hasOwn.call(doorSpecialMap, topKey)) doorSpecialMap[topKey] = value;
      if (!hasOwn.call(doorSpecialMap, botKey)) doorSpecialMap[botKey] = value;
    }

    expandSegmentEntries(individualColors);

    const mirrorLayouts = ensureMapRecord(data.mirrorLayoutMap);
    const mirrorEntries = Object.entries(mirrorLayouts);
    for (const [key, mirrorValue] of mirrorEntries) {
      const layouts = readMirrorLayoutList(mirrorValue);
      if (!layouts.length) continue;
      if (!String(key).endsWith('_full')) continue;
      const base = String(key).replace(/_full$/i, '');
      const topKey = base + '_top';
      const botKey = base + '_bot';
      if (!hasOwn.call(mirrorLayouts, topKey)) mirrorLayouts[topKey] = cloneMirrorLayoutList(layouts);
      if (!hasOwn.call(mirrorLayouts, botKey)) mirrorLayouts[botKey] = cloneMirrorLayoutList(layouts);
    }
  } catch {}
}
