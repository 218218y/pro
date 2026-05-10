// Door state helpers (Pure ESM)
//
// Centralizes per-door map lookups (hinge dir, split, bottom split, curtain, groove).

import { getModeId } from '../runtime/api.js';

import { isEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';

import type {
  BuilderDoorMapsConfigLike,
  BuilderDoorStateAccessorsLike,
  BuilderPartColorValue,
  HandleType,
  HingeDir,
  UnknownRecord,
} from '../../../types/index.js';

function isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function asRecord(x: unknown): UnknownRecord {
  return isRecord(x) ? x : {};
}

function readBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function readPartColorValue(value: unknown): BuilderPartColorValue {
  if (typeof value === 'string') return value;
  if (value == null) return value === null ? null : undefined;
  return String(value);
}

function _asObj(x: unknown): UnknownRecord | null {
  return isRecord(x) ? x : null;
}

const __hasOwn = Object.prototype.hasOwnProperty;

export function makeDoorStateAccessors(
  cfg: BuilderDoorMapsConfigLike | unknown
): BuilderDoorStateAccessorsLike {
  const c = asRecord(cfg);

  function getHingeDir(hingeKey: string, def: HingeDir): HingeDir {
    const hm = asRecord(c['hingeMap']);
    const v = hm[hingeKey];
    return v === 'left' || v === 'right' ? v : def;
  }

  function isDoorSplit(map: unknown, doorIdNum: number): boolean {
    // When splitDoors is on: default TRUE unless explicitly disabled.
    const m = _asObj(map);
    if (!m) return true;

    const base = `split_d${doorIdNum}`;
    if (__hasOwn.call(m, base)) return m[base] !== false;

    const full = `${base}_full`;
    if (__hasOwn.call(m, full)) return m[full] !== false;

    const top = `${base}_top`;
    if (__hasOwn.call(m, top)) return m[top] !== false;

    const bot = `${base}_bot`;
    if (__hasOwn.call(m, bot)) return m[bot] !== false;

    return true;
  }

  function isDoorSplitBottom(map: unknown, doorIdNum: number): boolean {
    // Bottom split is opt-in: default FALSE unless key exists and is true.
    const m = _asObj(map);
    if (!m) return false;

    const base = `splitb_d${doorIdNum}`;
    if (__hasOwn.call(m, base)) return m[base] === true;

    const full = `${base}_full`;
    if (__hasOwn.call(m, full)) return m[full] === true;

    const top = `${base}_top`;
    if (__hasOwn.call(m, top)) return m[top] === true;

    const bot = `${base}_bot`;
    if (__hasOwn.call(m, bot)) return m[bot] === true;

    return false;
  }

  const curtainVal: BuilderDoorStateAccessorsLike['curtainVal'] = (
    doorIdNumOrPartId,
    suffixOrDefaultValue,
    defaultValue
  ): BuilderPartColorValue => {
    const cm = asRecord(c['curtainMap']);
    if (typeof doorIdNumOrPartId === 'string') {
      const partId = doorIdNumOrPartId;
      if (__hasOwn.call(cm, partId)) return readPartColorValue(cm[partId]);
      if (partId.endsWith('_top') || partId.endsWith('_mid') || partId.endsWith('_bot')) {
        const full = partId.replace(/_(top|mid|bot)$/i, '_full');
        if (__hasOwn.call(cm, full)) return readPartColorValue(cm[full]);
      }
      return readPartColorValue(suffixOrDefaultValue);
    }

    const doorIdNum = doorIdNumOrPartId;
    const suffix = typeof suffixOrDefaultValue === 'string' ? suffixOrDefaultValue : 'full';
    const key = `d${doorIdNum}_${suffix}`;
    if (__hasOwn.call(cm, key)) return readPartColorValue(cm[key]);
    if (suffix === 'top' || suffix === 'mid' || suffix === 'bot') {
      const full = `d${doorIdNum}_full`;
      if (__hasOwn.call(cm, full)) return readPartColorValue(cm[full]);
    }
    return readPartColorValue(defaultValue);
  };

  function grooveVal(doorIdNum: number, suffix: string, fullDefault: boolean): boolean {
    const gm = asRecord(c['groovesMap']);
    const k = `groove_d${doorIdNum}_${suffix}`;
    if (__hasOwn.call(gm, k)) return readBool(gm[k]);
    return readBool(fullDefault);
  }

  return {
    getHingeDir,
    isDoorSplit,
    isDoorSplitBottom,
    curtainVal,
    grooveVal,
  };
}

/**
 * Remove-doors mode utilities.
 *
 * These helpers were extracted from builder/core to keep orchestration lean.
 */

function _removeDoorModeId(App: unknown): string {
  // Canonical id is 'remove_door'.
  return getModeId(App, 'REMOVE_DOOR') || 'remove_door';
}

/**
 * True when the current state is in REMOVE_DOOR mode.
 */
const DEFAULT_MODE: UnknownRecord = { primary: 'none', opts: {} };

export function isRemoveDoorMode(App: unknown, state: unknown): boolean {
  const st = _asObj(state);
  const mode = st && isRecord(st['mode']) ? st['mode'] : DEFAULT_MODE;
  const removeDoorModeId = _removeDoorModeId(App);
  return !!(mode && mode['primary'] === removeDoorModeId);
}

/**
 * True when doors should be removed (either by explicit toggle or by mode).
 */
export function isRemoveDoorsEnabled(App: unknown, ui: unknown, state: unknown): boolean {
  const u = _asObj(ui);
  return !!(u && readBool(u['removeDoorsEnabled'])) || isRemoveDoorMode(App, state);
}

/**
 * Build a predicate that checks whether a door/drawer part should be removed.
 */
export function makeDoorRemovalChecker(cfg: unknown): (partId: unknown) => boolean {
  const c = asRecord(cfg);
  const removedDoorsMap = asRecord(c['removedDoorsMap']);

  return function isDoorRemoved(partId: unknown): boolean {
    const m = removedDoorsMap;
    if (!partId) return false;
    let id = String(partId);
    // Canonical segmented-door ids: treat base ids as *_full.
    if (!/(?:_(?:full|top|bot|mid))$/i.test(id)) {
      if (
        /^(?:lower_)?d\d+$/.test(id) ||
        /^(?:lower_)?corner_door_\d+$/.test(id) ||
        /^(?:lower_)?corner_pent_door_\d+$/.test(id)
      ) {
        id = id + '_full';
      }
    }
    if (readBool(m[`removed_${id}`])) return true;

    // Segmented parts inherit from the full door key.
    if (id.endsWith('_top') || id.endsWith('_bot') || id.endsWith('_mid')) {
      const full = id.replace(/_(top|bot|mid)$/i, '_full');
      if (readBool(m[`removed_${full}`])) return true;
    }

    return false;
  };
}

function _isBottomSplitBotPart(
  id: string,
  cfg: UnknownRecord,
  doorState: BuilderDoorStateAccessorsLike
): boolean {
  if (!id) return false;
  const sid = String(id);
  if (!sid.endsWith('_bot')) return false;

  const baseId = sid.replace(/_bot$/, '');
  if (!baseId) return false;

  // Numeric door ids (d1_bot): use the canonical numeric split-bottom resolver.
  const m = /^d(\d+)$/.exec(baseId);
  if (m) {
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && !!doorState.isDoorSplitBottom(cfg['splitDoorsBottomMap'], n);
  }

  // Generic ids (e.g. corner_door_1_bot): bottom split is stored as `splitb_<baseId>` in the map.
  const bm = _asObj(cfg['splitDoorsBottomMap']);
  if (!bm) return false;

  const key = baseId.startsWith('splitb_') ? baseId : `splitb_${baseId}`;
  if (__hasOwn.call(bm, key)) return bm[key] === true;
  if (__hasOwn.call(bm, `${key}_full`)) return bm[`${key}_full`] === true;
  if (__hasOwn.call(bm, `${key}_top`)) return bm[`${key}_top`] === true;
  if (__hasOwn.call(bm, `${key}_bot`)) return bm[`${key}_bot`] === true;

  return false;
}
/**
 * Create a handle-type resolver.
 */
export function makeHandleTypeResolver(args: {
  App?: unknown;
  cfg: unknown;
  doorState: BuilderDoorStateAccessorsLike;
  handleControlEnabled: boolean;
  stackKey?: 'top' | 'bottom';
}): (id: unknown) => unknown {
  const App = args && args.App;
  const cfg = asRecord(args && args.cfg);
  const doorState: BuilderDoorStateAccessorsLike | null = args?.doorState ?? null;

  // `handleControlEnabled` is a UI concern (whether the user can edit per-door handles).
  // The *result* should still honor explicit overrides from handlesMap regardless.
  // (We keep the flag for compatibility and future logic.)
  const handleControlEnabled = !!(args && args.handleControlEnabled);
  void handleControlEnabled;

  const stackKey = args && args.stackKey === 'bottom' ? 'bottom' : 'top';

  const hm = isRecord(cfg['handlesMap']) ? cfg['handlesMap'] : null;

  const __global = cfg['globalHandleType'];
  const globalHandleType: HandleType | string =
    __global === undefined || __global === null || __global === '' ? 'standard' : String(__global);

  const __readOverride = (key: string): unknown => {
    if (!hm || !key) return undefined;
    if (!__hasOwn.call(hm, key)) return undefined;
    const v = hm[key];
    // Empty/cleared values behave like "no override".
    if (v === undefined || v === null || v === '') return undefined;
    return v;
  };

  const __stripSuffix = (id: string): string => {
    return id.replace(/_(top|mid|bot|full)$/, '');
  };

  return function getHandleType(id: unknown): unknown {
    const sid = id == null ? '' : String(id);
    const base = __stripSuffix(sid);

    // Bottom segment created by bottom-split: NO handle by default.
    // Allow handle only if user explicitly set one for that id (or for the base id).
    if (doorState && _isBottomSplitBotPart(sid, cfg, doorState)) {
      const ov = __readOverride(sid) ?? __readOverride(base);
      return ov !== undefined ? ov : 'none';
    }

    // Explicit overrides always win.
    const override = __readOverride(sid) ?? (__stripSuffix(sid) !== sid ? __readOverride(base) : undefined);
    if (override !== undefined) return override;

    // Global EDGE default: one handle per 2 adjacent doors (right door only).
    if (globalHandleType === 'edge' && App && isEdgeHandleDefaultNone(App, stackKey, base)) return 'none';

    return globalHandleType;
  };
}
