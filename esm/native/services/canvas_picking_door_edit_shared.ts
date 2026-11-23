import type { AppContainer, UnknownRecord } from '../../../types';

import {
  containsDoorArchPoint,
  doorArchOutline,
  doorArchY,
  readDoorArchCut,
  sampleDoorArch,
} from '../../shared/door_arch_geometry.js';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { isCanonicalDoorVisualMapKey } from '../../shared/door_visual_key_contracts_shared.js';
import { getToolsServiceMaybe } from '../runtime/service_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import type { DoorArchTool } from './canvas_picking_door_arch_target.js';
import { asRecord as readRecord } from '../runtime/record.js';
import { normalizeKnownMapSnapshot, writeDoorArchMaps } from '../runtime/maps_access.js';
import { readRootState } from '../runtime/root_state_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import {
  PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY,
  computeAutoGrooveLinesCount,
  normalizeGrooveLinesCount,
  readGrooveLinesCountForPart,
  readPendingGrooveLinesCountMap,
  resolvePendingGrooveLinesCount,
} from '../runtime/groove_lines_access.js';
import {
  buildGrooveLayoutFromHit,
  findGrooveLayoutMatchInRect,
  readDoorTrimMap,
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readGrooveLayoutList,
  readGrooveLayoutListForPart,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
} from '../features/door_authoring/api.js';
import {
  buildDoorVisualLookupKeys,
  toCanonicalGrooveLinesCountMapKey,
  toCanonicalGroovesMapKey,
} from '../../shared/door_groove_key_contracts_shared.js';
import { createCanvasPickingDoorAuthoringRefreshGatedMeta } from './canvas_picking_door_authoring_meta.js';
import { __wp_map, __wp_ui } from './canvas_picking_core_helpers.js';

export {
  containsDoorArchPoint,
  doorArchOutline,
  doorArchY,
  getDoorsArray,
  HINGED_DOOR_SPLIT_GEOMETRY_POLICY,
  isCanonicalDoorVisualMapKey,
  readDoorArchCut,
  sampleDoorArch,
  toCanonicalGroovesMapKey,
  writeDoorArchMaps,
  buildDoorVisualLookupKeys,
  buildGrooveLayoutFromHit,
  computeAutoGrooveLinesCount,
  findGrooveLayoutMatchInRect,
  normalizeGrooveLinesCount,
  normalizeKnownMapSnapshot,
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readGrooveLayoutList,
  readGrooveLayoutListForPart,
  readGrooveLinesCountForPart,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
  resolvePendingGrooveLinesCount,
};

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
  return normalizeKnownMapSnapshot('grooveLinesCountMap', __wp_map(App, 'grooveLinesCountMap'));
}

export function writePendingGrooveLinesCountForPart(
  App: AppContainer,
  partId: string,
  grooveLinesCount: number | null,
  source: string
): void {
  const key = toCanonicalGrooveLinesCountMapKey(partId);
  if (!key) return;
  const currentMap = readPendingGrooveLinesCountMap(App);
  const nextMap: Record<string, number> = { ...currentMap };
  if (grooveLinesCount === null) delete nextMap[key];
  else nextMap[key] = grooveLinesCount;
  patchRuntime(
    App,
    { [PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY]: nextMap },
    createCanvasPickingDoorAuthoringRefreshGatedMeta(App, source)
  );
}

export function isCanvasDoorArchCutSegment(group: unknown): boolean {
  return typeof asRecord(asRecord(group)?.userData)?.__wpArchCutBaseMinY === 'number';
}

export function readActiveDoorArchTool(
  App: AppContainer,
  modes: { split: boolean; groove: boolean; paint: boolean; splitVariant: string }
): DoorArchTool | null {
  const ui = __wp_ui(App);
  if (modes.split && modes.splitVariant === 'custom' && ui.doorCutArch === true) return 'cut';
  if (modes.groove && !ui.isChestMode && ui.grooveManualEnabled === true && ui.doorGrooveArch === true)
    return 'groove';
  if (
    modes.paint &&
    ui.doorMirrorArch === true &&
    getToolsServiceMaybe(App)?.getPaintColor?.() === 'mirror'
  ) {
    return 'mirror';
  }
  return null;
}
