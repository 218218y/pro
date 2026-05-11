import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  AppContainer,
  ConfigStateLike,
  ModulesActionsLike,
  RoomActionsLike,
  RuntimeStateLike,
  UiStateLike,
  UnknownRecord,
  WardrobeType,
} from '../../../types';

import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/project_config_lists_canonical.js';

export type MetaNoBuildFn = (
  actions: ActionsNamespaceLike,
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  source: string
) => ActionMetaLike;
export type ReportFn = (
  App: AppContainer,
  label: string,
  error: unknown,
  opts?: { throttleMs?: number }
) => void;

export interface WardrobeTypeProfileSnapshot {
  cfg: ConfigStateLike;
  ui: UiStateLike;
}

export type WardrobeTypeProfileMap = Record<string, WardrobeTypeProfileSnapshot>;

export interface RoomSelectSurface extends UnknownRecord {
  floorType?: () => unknown;
  wardrobeType?: () => unknown;
  isManualWidth?: () => boolean;
}

export interface DomainApiRoomSelectRoot extends UnknownRecord {
  room: RoomSelectSurface;
}

export interface InstallDomainApiRoomSectionArgs {
  App: AppContainer;
  select: DomainApiRoomSelectRoot;
  actions: ActionsNamespaceLike;
  roomActions: RoomActionsLike;
  modulesActions: ModulesActionsLike;
  _cfg(): ConfigStateLike;
  _ui(): UiStateLike;
  _rt(): RuntimeStateLike;
  _captureConfigSnapshot(): ConfigStateLike;
  _ensureObj(x: unknown): UnknownRecord;
  _meta(meta: ActionMetaLike | UnknownRecord | null | undefined, source: string): ActionMetaLike;
  _metaNoBuild: MetaNoBuildFn;
  _metaNoBuildNoHistory: MetaNoBuildFn;
  _domainApiReportNonFatal: ReportFn;
}

export const PROFILE_UI_RAW_KEYS = [
  'doorStyle',
  'singleDoorPos',
  'structureSelect',
  'cornerWidth',
  'cornerDoors',
  'cornerHeight',
  'cornerDepth',
  'baseType',
  'baseLegStyle',
  'baseLegColor',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'colorChoice',
  'customColor',
  'groovesEnabled',
  'splitDoors',
  'internalDrawersEnabled',
  'hasCornice',
  'showContents',
  'showHanger',
  'showDimensions',
  'globalClickMode',
  'multiColorEnabled',
  'handleControl',
  'hingeDirection',
  'removeDoorsEnabled',
  'cornerMode',
  'isChestMode',
  'lightingControl',
  'currentLayoutType',
  'currentGridDivisions',
  'currentGridShelfVariant',
  'currentExtDrawerType',
  'currentExtDrawerCount',
  'activeGridCellId',
  'currentCurtainChoice',
  'currentFloorType',
  'lastSelectedWallColor',
  'lastSelectedFloorStyleId',
  'lastSelectedFloorStyleIdByType',
  'lastLightPreset',
] satisfies readonly string[];

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null;
}

function cloneSnapshotRecord(value: unknown): UnknownRecord {
  const rec = asRecord(value);
  return rec ? { ...rec } : {};
}

type ProfileSnapshotCloneCache = Map<object, unknown[] | UnknownRecord>;

function readCachedProfileArrayClone(
  value: readonly unknown[],
  seen: ProfileSnapshotCloneCache
): unknown[] | null {
  const cached = seen.get(value);
  return Array.isArray(cached) ? cached : null;
}

function readCachedProfileRecordClone(
  value: UnknownRecord,
  seen: ProfileSnapshotCloneCache
): UnknownRecord | null {
  const cached = seen.get(value);
  return cached && typeof cached === 'object' && !Array.isArray(cached) ? (cached as UnknownRecord) : null;
}

function cloneProfileSnapshotArray(value: readonly unknown[], seen: ProfileSnapshotCloneCache): unknown[] {
  const cached = readCachedProfileArrayClone(value, seen);
  if (cached) return cached;

  const out: unknown[] = [];
  seen.set(value, out);
  for (let i = 0; i < value.length; i += 1) {
    const cloned = cloneProfileSnapshotValue(value[i], seen);
    out[i] = typeof cloned === 'undefined' ? null : cloned;
  }
  return out;
}

function cloneProfileSnapshotRecord(
  value: UnknownRecord,
  seen: ProfileSnapshotCloneCache
): UnknownRecord | undefined {
  const cached = readCachedProfileRecordClone(value, seen);
  if (cached) return cached;

  const out: UnknownRecord = {};
  seen.set(value, out);

  const toJson = typeof value.toJSON === 'function' ? value.toJSON() : value;
  const rec = toJson !== value ? asRecord(toJson) : value;
  if (!rec) return out;

  let sawEntry = false;
  let wroteEntry = false;
  for (const [key, raw] of Object.entries(rec)) {
    sawEntry = true;
    const cloned = cloneProfileSnapshotValue(raw, seen);
    if (typeof cloned !== 'undefined') {
      out[key] = cloned;
      wroteEntry = true;
    }
  }
  if (sawEntry && !wroteEntry) return undefined;
  return out;
}

function cloneProfileSnapshotValue(value: unknown, seen: ProfileSnapshotCloneCache): unknown {
  if (value == null) return value;

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'bigint':
    case 'function':
    case 'symbol':
    case 'undefined':
      return undefined;
    case 'object':
      if (Array.isArray(value)) return cloneProfileSnapshotArray(value, seen);
      {
        const rec = asRecord(value);
        return rec ? cloneProfileSnapshotRecord(rec, seen) : undefined;
      }
    default:
      return value;
  }
}

export function readUiStateSnapshot(value: unknown): UiStateLike {
  return cloneSnapshotRecord(value);
}

export function safeCloneProfileSnapshot(
  App: AppContainer,
  _ensureObj: (x: unknown) => UnknownRecord,
  reportNonFatal: ReportFn,
  value: unknown
): UnknownRecord {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_e) {
    reportNonFatal(App, 'domain_api_room:safeCloneProfileSnapshot', _e, { throttleMs: 6000 });
  }
  const sanitized = cloneProfileSnapshotValue(value, new Map<object, unknown[] | UnknownRecord>());
  return asRecord(sanitized) || _ensureObj(value);
}

export function cloneConfigStateSnapshot(
  App: AppContainer,
  _ensureObj: (x: unknown) => UnknownRecord,
  reportNonFatal: ReportFn,
  value: unknown
): ConfigStateLike {
  return cloneSnapshotRecord(safeCloneProfileSnapshot(App, _ensureObj, reportNonFatal, value));
}

export function canonicalizeWardrobeTypeProfileConfigSnapshot(
  App: AppContainer,
  _ensureObj: (x: unknown) => UnknownRecord,
  reportNonFatal: ReportFn,
  cfgValue: unknown,
  uiValue: unknown
): ConfigStateLike {
  const cfg = cloneConfigStateSnapshot(App, _ensureObj, reportNonFatal, cfgValue);
  const ui = cloneUiStateSnapshot(App, _ensureObj, reportNonFatal, uiValue);

  return canonicalizeProjectConfigStructuralSnapshot(cfg, {
    uiSnapshot: ui,
    cfgSnapshot: cfg,
    cornerMode: 'auto',
    topMode: 'materialize',
  });
}

export function cloneUiStateSnapshot(
  App: AppContainer,
  _ensureObj: (x: unknown) => UnknownRecord,
  reportNonFatal: ReportFn,
  value: unknown
): UiStateLike {
  return readUiStateSnapshot(safeCloneProfileSnapshot(App, _ensureObj, reportNonFatal, value));
}

export function pickUiForWardrobeTypeProfile(uiIn: unknown): UiStateLike {
  const ui0 = readUiStateSnapshot(uiIn);
  const raw0 = asRecord(ui0.raw) || {};

  const outRaw: UnknownRecord = {};
  const out: UiStateLike = { raw: outRaw };

  if (raw0.width !== undefined) outRaw.width = raw0.width;
  if (raw0.height !== undefined) outRaw.height = raw0.height;
  if (raw0.depth !== undefined) outRaw.depth = raw0.depth;
  if (raw0.doors !== undefined) outRaw.doors = raw0.doors;
  if (raw0.chestDrawersCount !== undefined) outRaw.chestDrawersCount = raw0.chestDrawersCount;
  if (raw0.chestCommodeMirrorHeightCm !== undefined) {
    outRaw.chestCommodeMirrorHeightCm = raw0.chestCommodeMirrorHeightCm;
  }
  if (raw0.chestCommodeMirrorWidthCm !== undefined) {
    outRaw.chestCommodeMirrorWidthCm = raw0.chestCommodeMirrorWidthCm;
  }

  for (const key of PROFILE_UI_RAW_KEYS) {
    if (raw0[key] !== undefined) outRaw[key] = raw0[key];
  }

  if (ui0.currentFloorType !== undefined) out.currentFloorType = ui0.currentFloorType;
  return out;
}

export function readWardrobeTypeProfiles(
  App: AppContainer,
  rt: RuntimeStateLike,
  _ensureObj: (x: unknown) => UnknownRecord,
  reportNonFatal: ReportFn
): WardrobeTypeProfileMap {
  const raw = _ensureObj(rt.wardrobeTypeProfiles);
  const out: WardrobeTypeProfileMap = {};
  for (const [key, value] of Object.entries(raw)) {
    const profile = asRecord(value);
    if (!profile) continue;
    const ui = readUiStateSnapshot(profile.ui);
    out[key] = {
      cfg: canonicalizeWardrobeTypeProfileConfigSnapshot(App, _ensureObj, reportNonFatal, profile.cfg, ui),
      ui,
    };
  }
  return out;
}

export function normalizeWardrobeType(value: unknown): WardrobeType {
  return value === 'sliding' ? 'sliding' : 'hinged';
}
