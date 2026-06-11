import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord as readRecord } from '../runtime/record.js';
import { readRootState } from '../runtime/root_state_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import {
  PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY,
  readPendingGrooveLinesCountMap,
} from '../runtime/groove_lines_access.js';
import { readDoorTrimMap } from '../features/door_trim.js';
import { __wp_map, __wp_metaNoBuild } from './canvas_picking_core_helpers.js';

export function asRecord<T extends UnknownRecord = UnknownRecord>(value: unknown): T | null {
  return readRecord<T>(value);
}

export function ensureRecordSlot(host: UnknownRecord, key: string): UnknownRecord {
  const current = asRecord(host[key]);
  if (current) return current;
  const created: UnknownRecord = {};
  host[key] = created;
  return created;
}

export function readSplitVariant(App: AppContainer): string {
  try {
    const rootState = asRecord(readRootState(App));
    const mode = asRecord(rootState?.mode);
    const opts = asRecord(mode?.opts);
    return typeof opts?.splitVariant === 'string' ? String(opts.splitVariant) : '';
  } catch {
    return '';
  }
}

export function readDoorTrimModeOpts(App: AppContainer): UnknownRecord {
  try {
    const rootState = asRecord(readRootState(App));
    const mode = asRecord(rootState?.mode);
    return asRecord(mode?.opts) || {};
  } catch {
    return {};
  }
}

export function readDoorTrimConfigMap(App: AppContainer) {
  try {
    const rootState = asRecord(readRootState(App));
    const config = asRecord(rootState?.config);
    return readDoorTrimMap(config?.doorTrimMap);
  } catch {
    return readDoorTrimMap(null);
  }
}

export function readGrooveLinesCountMap(App: AppContainer): UnknownRecord {
  return __wp_map(App, 'grooveLinesCountMap');
}

export function writePendingGrooveLinesCountForPart(
  App: AppContainer,
  partId: string,
  grooveLinesCount: number | null,
  source: string
): void {
  const key = String(partId || '');
  if (!key) return;
  const currentMap = readPendingGrooveLinesCountMap(App);
  const nextMap: Record<string, number> = { ...currentMap };
  if (grooveLinesCount === null) delete nextMap[key];
  else nextMap[key] = grooveLinesCount;
  patchRuntime(
    App,
    { [PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY]: nextMap },
    __wp_metaNoBuild(App, source, { immediate: true, source })
  );
}
