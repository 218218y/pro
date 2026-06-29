// Door state helpers (Pure ESM)
//
// Centralizes per-door map lookups (hinge dir, split, bottom split, curtain, groove).

import { readCanonicalPositiveIntegerText } from './build_flow_readers.js';

import type {
  BuilderDoorMapsConfigLike,
  BuilderDoorRemovedResolver,
  BuilderDoorStateAccessorsLike,
  BuilderEdgeHandleDefaultNoneReader,
  BuilderHandleTypeResolver,
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
  return v === true;
}

function readPartColorValue(value: unknown): BuilderPartColorValue {
  if (typeof value === 'string') return value;
  if (value == null) return value === null ? null : undefined;
  return String(value);
}

function asRecordOrNull(x: unknown): UnknownRecord | null {
  return isRecord(x) ? x : null;
}

const hasOwn = Object.prototype.hasOwnProperty;

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
    const m = asRecordOrNull(map);
    if (!m) return true;

    const base = `split_d${doorIdNum}`;
    if (hasOwn.call(m, base)) return m[base] !== false;

    return true;
  }

  function isDoorSplitBottom(map: unknown, doorIdNum: number): boolean {
    // Bottom split is opt-in: default FALSE unless key exists and is true.
    const m = asRecordOrNull(map);
    if (!m) return false;

    const base = `splitb_d${doorIdNum}`;
    if (hasOwn.call(m, base)) return m[base] === true;

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
      if (hasOwn.call(cm, partId)) return readPartColorValue(cm[partId]);
      if (partId.endsWith('_top') || partId.endsWith('_mid') || partId.endsWith('_bot')) {
        const full = partId.replace(/_(top|mid|bot)$/i, '_full');
        if (hasOwn.call(cm, full)) return readPartColorValue(cm[full]);
      }
      return readPartColorValue(suffixOrDefaultValue);
    }

    const doorIdNum = doorIdNumOrPartId;
    const suffix = typeof suffixOrDefaultValue === 'string' ? suffixOrDefaultValue : 'full';
    const key = `d${doorIdNum}_${suffix}`;
    if (hasOwn.call(cm, key)) return readPartColorValue(cm[key]);
    if (suffix === 'top' || suffix === 'mid' || suffix === 'bot') {
      const full = `d${doorIdNum}_full`;
      if (hasOwn.call(cm, full)) return readPartColorValue(cm[full]);
    }
    return readPartColorValue(defaultValue);
  };

  function grooveVal(doorIdNum: number, suffix: string, fullDefault: boolean): boolean {
    const gm = asRecord(c['groovesMap']);
    const k = `groove_d${doorIdNum}_${suffix}`;
    if (hasOwn.call(gm, k)) return readBool(gm[k]);
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
 * Build a predicate that checks whether a door/drawer part should be removed.
 */
export function makeDoorRemovalChecker(cfg: unknown): BuilderDoorRemovedResolver {
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

function isBottomSplitBotPart(
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
    const n = readCanonicalPositiveIntegerText(m[1]);
    return n != null && !!doorState.isDoorSplitBottom(cfg['splitDoorsBottomMap'], n);
  }

  // Generic ids (e.g. corner_door_1_bot): bottom split is stored as `splitb_<baseId>`.
  const bm = asRecordOrNull(cfg['splitDoorsBottomMap']);
  if (!bm) return false;

  const key = baseId.startsWith('splitb_') ? baseId : `splitb_${baseId}`;
  if (hasOwn.call(bm, key)) return bm[key] === true;

  return false;
}
/**
 * Create a handle-type resolver.
 */
export function makeHandleTypeResolver(args: {
  cfg: BuilderDoorMapsConfigLike;
  doorState: BuilderDoorStateAccessorsLike;
  isEdgeHandleDefaultNone: BuilderEdgeHandleDefaultNoneReader;
}): BuilderHandleTypeResolver {
  const cfg = asRecord(args.cfg);
  const doorState = args.doorState;
  const edgeHandleDefaultNone = args.isEdgeHandleDefaultNone;
  if (typeof edgeHandleDefaultNone !== 'function') {
    throw new TypeError('[doors_state_utils] isEdgeHandleDefaultNone reader is required');
  }

  const hm = isRecord(cfg['handlesMap']) ? cfg['handlesMap'] : null;

  const globalValue = cfg['globalHandleType'];
  const globalHandleType: HandleType | string =
    globalValue === undefined || globalValue === null || globalValue === ''
      ? 'standard'
      : String(globalValue);

  const readOverride = (key: string): unknown => {
    if (!hm || !key) return undefined;
    if (!hasOwn.call(hm, key)) return undefined;
    const v = hm[key];
    // Empty/cleared values behave like "no override".
    if (v === undefined || v === null || v === '') return undefined;
    return v;
  };

  const stripSuffix = (id: string): string => {
    return id.replace(/_(top|mid|bot|full)$/, '');
  };

  return function getHandleType(id: unknown): unknown {
    const sid = id == null ? '' : String(id);
    const base = stripSuffix(sid);

    // Bottom segment created by bottom-split: NO handle by default.
    // Allow handle only if user explicitly set one for that id (or for the base id).
    if (isBottomSplitBotPart(sid, cfg, doorState)) {
      const ov = readOverride(sid) ?? readOverride(base);
      return ov !== undefined ? ov : 'none';
    }

    // Explicit overrides always win.
    const override = readOverride(sid) ?? (stripSuffix(sid) !== sid ? readOverride(base) : undefined);
    if (override !== undefined) return override;

    // Global EDGE default: one handle per 2 adjacent doors (right door only).
    if (globalHandleType === 'edge' && edgeHandleDefaultNone(base)) return 'none';

    return globalHandleType;
  };
}
