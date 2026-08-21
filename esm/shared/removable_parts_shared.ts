import type { RemovedDoorsMap } from '../../types/index.js';

import {
  isCanonicalRemovedDoorsMapKey,
  listCanonicalRemovedDoorLookupKeys,
  toCanonicalRemovedDoorPartId,
} from './removed_doors_map_keys_shared.js';
import { formatIdentityValue, readIdentityValue } from './identity_value_shared.js';

function readPartId(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value)).trim();
}

export type RemovableFrameSide = 'left' | 'right';
export type RemovableFrameSidePartIdPrefix = '' | 'lower_';

export type RemovableSketchBoxSidePart = Readonly<{
  partId: string;
  boxPartId: string;
  side: RemovableFrameSide;
}>;

export type RemovedPartsMapSnapshot = Readonly<RemovedDoorsMap>;

type UnknownRecord = Record<string, unknown>;

export const ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME = 'roundedFrameSideShelvesMap';

export const REMOVABLE_FRAME_SIDE_PART_ID_BY_SIDE: Readonly<Record<RemovableFrameSide, string>> =
  Object.freeze({
    left: 'body_left',
    right: 'body_right',
  });

const CANVAS_REMOVABLE_FRAME_SIDE_PART_IDS = new Set([
  ...Object.values(REMOVABLE_FRAME_SIDE_PART_ID_BY_SIDE),
  ...Object.values(REMOVABLE_FRAME_SIDE_PART_ID_BY_SIDE).map(partId => `lower_${partId}`),
]);

const HINGED_DOOR_PART_ID_RE = /^(lower_)?d(\d+)(?:_(?:full|top|bot|mid\d*))?$/i;

function asRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readToggleValue(value: unknown): true | false | null | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null) return null;
  return undefined;
}

function collectRemovedPartsMap(value: unknown, canonicalOnly: boolean): RemovedDoorsMap {
  const record = asRecord(value);
  const out: RemovedDoorsMap = Object.create(null);
  if (!record) return out;

  for (const key of Object.keys(record)) {
    if (canonicalOnly && !isCanonicalRemovedDoorsMapKey(key)) continue;
    const next = readToggleValue(record[key]);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

/**
 * Detached read snapshot for the persisted `removedDoorsMap` surface.
 *
 * The persisted map also carries removable structural-part ids, so consumers
 * query it through these canonical helpers instead of rebuilding map keys.
 */
export function captureRemovedPartsMapSnapshot(value: unknown): RemovedPartsMapSnapshot {
  return Object.freeze(collectRemovedPartsMap(value, false));
}

/** Canonical normalizer for persisted/project removed-part maps. */
export function normalizeCanonicalRemovedPartsMap(value: unknown): RemovedDoorsMap {
  return collectRemovedPartsMap(value, true);
}

export function isRemovedPartOnMap(removedPartsMap: RemovedPartsMapSnapshot, partId: unknown): boolean {
  return listCanonicalRemovedDoorLookupKeys(partId).some(key => removedPartsMap[key] === true);
}

export function createRemovedPartReader(
  removedPartsMap: RemovedPartsMapSnapshot
): (partId: unknown) => boolean {
  return (partId: unknown): boolean => isRemovedPartOnMap(removedPartsMap, partId);
}

export function hasRemovedHingedDoorInMapRange(args: {
  removedPartsMap: RemovedPartsMapSnapshot;
  startDoorId: number;
  moduleDoors: number;
  frameSidePartIdPrefix?: unknown;
}): boolean {
  const endDoorId = args.startDoorId + args.moduleDoors - 1;
  const isLowerStack = args.frameSidePartIdPrefix === 'lower_';

  for (const [rawKey, value] of Object.entries(args.removedPartsMap)) {
    if (value !== true) continue;
    const canonicalPartId = toCanonicalRemovedDoorPartId(rawKey);
    const match = HINGED_DOOR_PART_ID_RE.exec(canonicalPartId);
    if (!match) continue;
    const isLowerDoor = !!match[1];
    if (isLowerDoor !== isLowerStack) continue;
    const doorId = Number(match[2]);
    if (Number.isInteger(doorId) && doorId >= args.startDoorId && doorId <= endDoorId) return true;
  }

  return false;
}

function readConfigMap(cfg: unknown, mapName: string): UnknownRecord {
  const cfgRecord = asRecord(cfg);
  return asRecord(cfgRecord?.[mapName]) || {};
}

function readRemovedPartsMapFromConfig(cfg: unknown): RemovedPartsMapSnapshot {
  return captureRemovedPartsMapSnapshot(asRecord(cfg)?.removedDoorsMap);
}

function readFrameSidePartIdPrefix(value: unknown): RemovableFrameSidePartIdPrefix {
  return readPartId(value) === 'lower_' ? 'lower_' : '';
}

export function frameSideToPartId(side: RemovableFrameSide, partIdPrefix?: unknown): string {
  return `${readFrameSidePartIdPrefix(partIdPrefix)}${REMOVABLE_FRAME_SIDE_PART_ID_BY_SIDE[side]}`;
}

export function sketchBoxSideToPartId(boxPartId: unknown, side: RemovableFrameSide): string {
  const boxPid = readPartId(boxPartId);
  return boxPid ? `${boxPid}_side_${side}` : '';
}

export function readRemovableFrameSideFromPartId(partId: unknown): RemovableFrameSide | null {
  const pid = canonicalRemovablePartKey(partId);
  if (pid === 'body_left' || pid === 'lower_body_left') return 'left';
  if (pid === 'body_right' || pid === 'lower_body_right') return 'right';
  return null;
}

export function readRemovableSketchBoxSideFromPartId(partId: unknown): RemovableSketchBoxSidePart | null {
  const pid = canonicalRemovablePartKey(partId);
  const match = /^(sketch_box(?:_free)?_.+)_side_(left|right)$/.exec(pid);
  if (!match) return null;
  return {
    partId: pid,
    boxPartId: match[1] || '',
    side: match[2] === 'right' ? 'right' : 'left',
  };
}

function isRemovedFrameSidePartOn(cfg: unknown, partId: string): boolean {
  return isRemovedPartOnMap(readRemovedPartsMapFromConfig(cfg), partId);
}

function isRoundedFrameSideShelvesPartOn(cfg: unknown, partId: string): boolean {
  const map = readConfigMap(cfg, ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME);
  return map[partId] === true;
}

export function isRemovedFrameSideOn(
  cfg: unknown,
  side: RemovableFrameSide,
  partIdPrefix?: unknown
): boolean {
  return isRemovedFrameSidePartOn(cfg, frameSideToPartId(side, partIdPrefix));
}

export function isRoundedFrameSideShelvesOn(
  cfg: unknown,
  side: RemovableFrameSide,
  partIdPrefix?: unknown
): boolean {
  return isRoundedFrameSideShelvesPartOn(cfg, frameSideToPartId(side, partIdPrefix));
}

function readRemovedSketchBoxSidePartIds(cfg: unknown): string[] {
  const out: string[] = [];
  const map = readRemovedPartsMapFromConfig(cfg);
  for (const key of Object.keys(map)) {
    if (map[key] !== true) continue;
    const partId = canonicalRemovablePartKey(key);
    if (readRemovableSketchBoxSideFromPartId(partId)) out.push(partId);
  }
  return out;
}

export function readRemovedFrameSidePartIds(cfg: unknown): string[] {
  const out: string[] = [];
  for (const side of ['left', 'right'] as const) {
    for (const prefix of ['', 'lower_'] as const) {
      const partId = frameSideToPartId(side, prefix);
      if (isRemovedFrameSidePartOn(cfg, partId)) out.push(partId);
    }
  }
  out.push(...readRemovedSketchBoxSidePartIds(cfg));
  return out;
}

function readRemovedSidePartIds(cfg: unknown, side: RemovableFrameSide): string[] {
  const partIds: string[] = [];
  for (const prefix of ['', 'lower_'] as const) {
    const partId = frameSideToPartId(side, prefix);
    if (isRemovedFrameSidePartOn(cfg, partId)) partIds.push(partId);
  }
  for (const partId of readRemovedSketchBoxSidePartIds(cfg)) {
    if (readRemovableSketchBoxSideFromPartId(partId)?.side === side) partIds.push(partId);
  }
  return partIds;
}

function readAggregateRemovedFrameSideState(
  cfg: unknown,
  side: RemovableFrameSide
): {
  removed: boolean;
  rounded: boolean;
} {
  const removedPartIds = readRemovedSidePartIds(cfg, side);
  return {
    removed: removedPartIds.length > 0,
    rounded:
      removedPartIds.length > 0 &&
      removedPartIds.every(partId => isRoundedFrameSideShelvesPartOn(cfg, partId)),
  };
}

export function readRemovedFrameSideShelfState(cfg: unknown): {
  leftRemoved: boolean;
  rightRemoved: boolean;
  leftRounded: boolean;
  rightRounded: boolean;
} {
  const left = readAggregateRemovedFrameSideState(cfg, 'left');
  const right = readAggregateRemovedFrameSideState(cfg, 'right');
  return {
    leftRemoved: left.removed,
    rightRemoved: right.removed,
    leftRounded: left.rounded,
    rightRounded: right.rounded,
  };
}

export function readSketchBoxRemovedSideShelfState(
  cfg: unknown,
  boxPartId: unknown
): {
  leftRemoved: boolean;
  rightRemoved: boolean;
  leftRounded: boolean;
  rightRounded: boolean;
} {
  const leftPartId = sketchBoxSideToPartId(boxPartId, 'left');
  const rightPartId = sketchBoxSideToPartId(boxPartId, 'right');
  const leftRemoved = !!leftPartId && isRemovedFrameSidePartOn(cfg, leftPartId);
  const rightRemoved = !!rightPartId && isRemovedFrameSidePartOn(cfg, rightPartId);
  return {
    leftRemoved,
    rightRemoved,
    leftRounded: leftRemoved && isRoundedFrameSideShelvesPartOn(cfg, leftPartId),
    rightRounded: rightRemoved && isRoundedFrameSideShelvesPartOn(cfg, rightPartId),
  };
}

export function isDoorLikeRemovablePartId(partId: unknown): boolean {
  const pid = readPartId(partId);
  if (!pid) return false;
  if (/^(?:lower_)?d\d+(?:_|$)/.test(pid) && !pid.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(pid)) return true;
  if (pid.startsWith('sliding') || pid.startsWith('slide')) return true;
  if (pid.startsWith('lower_sliding') || pid.startsWith('lower_slide')) return true;
  return (
    pid.startsWith('corner_door') ||
    pid.startsWith('corner_pent_door') ||
    pid.startsWith('lower_corner_door') ||
    pid.startsWith('lower_corner_pent_door')
  );
}

export function isDrawerLikeRemovablePartId(partId: unknown): boolean {
  const pid = readPartId(partId);
  if (!pid) return false;
  if (/^(?:lower_)?d\d+_draw_/.test(pid)) return true;
  if (/^chest_drawer_\d+$/.test(pid)) return true;
  if (pid === 'internal_drawer_accent_line') return false;
  return pid.includes('_draw_') || pid.includes('drawer') || pid.includes('draw');
}

export function isDoorOrDrawerLikeRemovablePartId(partId: unknown): boolean {
  return isDoorLikeRemovablePartId(partId) || isDrawerLikeRemovablePartId(partId);
}

export function isCanvasRemovablePartId(partId: unknown): boolean {
  const pid = readPartId(partId);
  if (!pid) return false;
  if (isDoorOrDrawerLikeRemovablePartId(pid)) return false;
  if (pid.includes('selector') || pid.includes('hitbox') || pid.includes('dimension')) return false;
  return CANVAS_REMOVABLE_FRAME_SIDE_PART_IDS.has(pid) || !!readRemovableSketchBoxSideFromPartId(pid);
}

export function canonicalRemovablePartKey(partId: unknown): string {
  const pid = readPartId(partId);
  if (!pid) return '';
  return pid.startsWith('removed_') ? pid.slice('removed_'.length) : pid;
}
