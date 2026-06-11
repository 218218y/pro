// Corner-cell patch/list sanitization owner.
// Keeps record-patch semantics and top-vs-lower list normalization in one focused seam.

import type { ModuleConfigLike, NormalizedTopModuleConfigLike } from '../../../../types';

import { normalizeTopModuleConfigTyped } from './modules_config_api.js';
import { createDefaultLowerModuleConfig, normalizeLowerModuleConfig } from '../stack_split/module_config.js';
import {
  asList,
  cloneRecord,
  isRecord,
  type CornerCellConfigLike,
  type UnknownRecord,
} from './corner_cells_contracts.js';
import { resolveTopCornerCellDefaultLayout } from './corner_cells_ui_defaults.js';

function shallowCornerRecordEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;
  if (!isRecord(prev) || !isRecord(next)) return false;
  const prevObj = prev;
  const nextObj = next;
  const prevKeys = Object.keys(prevObj);
  const nextKeys = Object.keys(nextObj);
  if (prevKeys.length !== nextKeys.length) return false;
  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(nextObj, key)) return false;
    if (!Object.is(prevObj[key], nextObj[key])) return false;
  }
  return true;
}

function sameCornerListRefs<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function isDenseRecordList<T extends UnknownRecord = UnknownRecord>(v: unknown): v is T[] {
  if (!Array.isArray(v)) return false;
  for (let i = 0; i < v.length; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(v, i)) return false;
    if (!isRecord(v[i])) return false;
  }
  return true;
}

function isDenseCornerCellList<T extends CornerCellConfigLike = CornerCellConfigLike>(v: unknown): v is T[] {
  return isDenseRecordList(v);
}

function applyCornerCellPatch(cellIn: CornerCellConfigLike, patch: unknown): CornerCellConfigLike {
  const prevCell: UnknownRecord = isRecord(cellIn) ? cellIn : {};
  const cell: UnknownRecord = Object.assign({}, isRecord(cellIn) ? cellIn : {});
  let patchVal: unknown = patch;

  if (typeof patch === 'function') {
    try {
      patchVal = Reflect.apply(patch, undefined, [cell, Object.assign({}, cell)]);
    } catch {
      patchVal = undefined;
    }
  }

  if (!isRecord(patchVal)) return cell;

  for (const k of Object.keys(patchVal)) {
    const v = patchVal[k];
    if (v === undefined || v === null) {
      try {
        delete cell[k];
      } catch {
        // ignore
      }
      continue;
    }

    if (k === 'customData' && isRecord(v) && isRecord(cell.customData)) {
      cell.customData = Object.assign({}, cell.customData, v);
      continue;
    }

    cell[k] = v;
  }

  if (shallowCornerRecordEqual(prevCell, cell)) return prevCell;
  return cell;
}

/**
 * Corner top-cells list (cornerConfiguration.modulesConfiguration).
 * Keep entries as objects, never holes/nulls.
 */
export function sanitizeCornerCellListForPatch(nextVal: unknown, prevVal: unknown): CornerCellConfigLike[] {
  const nextList = Array.isArray(nextVal) ? nextVal : Array.isArray(prevVal) ? prevVal : [];
  const prevList = asList(prevVal);

  const out: CornerCellConfigLike[] = new Array(nextList.length);
  for (let i = 0; i < nextList.length; i++) {
    const v = nextList[i];
    const pv = prevList[i];

    const candidate = isRecord(v) ? v : isRecord(pv) ? pv : {};
    // Shallow clone to avoid accidental external mutation.
    out[i] = cloneRecord(candidate);
  }
  return out;
}

/**
 * Patch a single corner TOP cell in a list, producing a new sanitized list.
 * This always materializes the list up to `index` (no holes).
 */
export function patchCornerCellListAtForPatch(
  nextVal: unknown,
  prevVal: unknown,
  index: number,
  patch: unknown
): CornerCellConfigLike[] {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;

  const cur =
    Object.is(nextVal, prevVal) && isDenseRecordList<CornerCellConfigLike>(prevVal)
      ? prevVal
      : sanitizeCornerCellListForPatch(nextVal, prevVal);
  const out = cur.slice();

  while (out.length <= i) out.push({});

  const prevItem = out[i];
  const nextItem = applyCornerCellPatch(prevItem, patch);
  if (Object.is(prevItem, nextItem) && out.length === cur.length) return cur;
  out[i] = nextItem;

  return sameCornerListRefs(cur, out) ? cur : out;
}

export type NormalizeCornerCellForPatchOptions<T extends CornerCellConfigLike = CornerCellConfigLike> = {
  defaultLayout?: string | ((index: number) => string);
  normalizeCell?: (cell: CornerCellConfigLike, index: number, doors: number) => T;
};

function readCornerCellDoorsCount(value: unknown, fallback = 2): number {
  const doors = parseInt(String((isRecord(value) ? value.doors : undefined) ?? ''), 10);
  return Number.isFinite(doors) && doors > 0 ? doors : fallback;
}

function resolveCornerCellDefaultLayout(
  options: NormalizeCornerCellForPatchOptions | undefined,
  index: number
): string | null {
  const layout = options?.defaultLayout;
  if (typeof layout === 'function') {
    const resolved = layout(index);
    return resolved ? String(resolved) : null;
  }
  return typeof layout === 'string' && layout ? layout : null;
}

type NormalizeCornerCellForPatchFn = {
  (value: unknown, index: number): CornerCellConfigLike;
  <T extends CornerCellConfigLike>(
    value: unknown,
    index: number,
    options: NormalizeCornerCellForPatchOptions<T>
  ): T;
};

export const normalizeCornerCellForPatch: NormalizeCornerCellForPatchFn = ((
  value: unknown,
  index: number,
  options?: NormalizeCornerCellForPatchOptions
): CornerCellConfigLike => {
  const base = isRecord(value) ? cloneRecord(value) : {};
  if (!base.layout) {
    const fallbackLayout = resolveCornerCellDefaultLayout(options, index);
    if (fallbackLayout) base.layout = fallbackLayout;
  }

  const doors = readCornerCellDoorsCount(base, 2);
  const normalized = options?.normalizeCell ? options.normalizeCell(base, index, doors) : base;
  return isRecord(normalized) ? cloneRecord(normalized) : base;
}) as NormalizeCornerCellForPatchFn;

export function patchNormalizedCornerCellListAtForPatch<
  T extends CornerCellConfigLike = CornerCellConfigLike,
>(
  nextVal: unknown,
  prevVal: unknown,
  index: number,
  patch: unknown,
  options?: NormalizeCornerCellForPatchOptions<T>
): T[] {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  const normalizeOptions: NormalizeCornerCellForPatchOptions<T> = options || {};
  const cur: T[] =
    Object.is(nextVal, prevVal) && isDenseCornerCellList<T>(prevVal)
      ? prevVal
      : sanitizeCornerCellListForPatch(nextVal, prevVal).map((entry, entryIndex) =>
          normalizeCornerCellForPatch(entry, entryIndex, normalizeOptions)
        );
  const out = cur.slice();

  while (out.length <= i) {
    out.push(normalizeCornerCellForPatch({}, out.length, normalizeOptions));
  }

  const prevItem = normalizeCornerCellForPatch(out[i], i, normalizeOptions);
  const rawNextItem = applyCornerCellPatch(prevItem, patch);
  const nextItem = normalizeCornerCellForPatch(rawNextItem, i, normalizeOptions);
  if (shallowCornerRecordEqual(prevItem, nextItem) && out.length === cur.length) return cur;
  out[i] = nextItem;

  return sameCornerListRefs(cur, out) ? cur : out;
}

function normalizeLowerModuleConfigForPatch(src: unknown, i: number): ModuleConfigLike {
  return normalizeLowerModuleConfig(src, i);
}

/**
 * Patch a single corner LOWER cell in a list, producing a new sanitized list.
 * This materializes the list up to `index` and normalizes entries using the LOWER schema.
 */
export function patchLowerCornerCellListAtForPatch(
  nextVal: unknown,
  prevVal: unknown,
  index: number,
  patch: unknown
): ModuleConfigLike[] {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;

  const cur =
    Object.is(nextVal, prevVal) && isDenseRecordList<ModuleConfigLike>(prevVal)
      ? prevVal
      : sanitizeLowerCornerCellListForPatch(nextVal, prevVal);
  const out = cur.slice();

  while (out.length <= i) out.push(createDefaultLowerModuleConfig(out.length));

  const prevItem = out[i];
  const rawNextItem = applyCornerCellPatch(prevItem, patch);
  const normalizedNextItem = normalizeLowerModuleConfigForPatch(rawNextItem, i);
  const nextItem = shallowCornerRecordEqual(rawNextItem, normalizedNextItem)
    ? rawNextItem
    : normalizedNextItem;
  if (Object.is(prevItem, nextItem) && out.length === cur.length) return cur;
  out[i] = nextItem;

  return sameCornerListRefs(cur, out) ? cur : out;
}

/**
 * Corner LOWER stack-split cells list (cornerConfiguration.stackSplitLower.modulesConfiguration).
 * These entries follow the LOWER module config schema, so we normalize them.
 */
export function sanitizeLowerCornerCellListForPatch(nextVal: unknown, prevVal: unknown): ModuleConfigLike[] {
  const nextList = Array.isArray(nextVal) ? nextVal : Array.isArray(prevVal) ? prevVal : [];
  const prevList = asList(prevVal);

  const out: ModuleConfigLike[] = new Array(nextList.length);
  for (let i = 0; i < nextList.length; i++) {
    const v = nextList[i];
    const pv = prevList[i];

    const candidate = isRecord(v) ? v : isRecord(pv) ? pv : createDefaultLowerModuleConfig(i);

    out[i] = normalizeLowerModuleConfigForPatch(candidate, i);
  }
  return out;
}

export function createDefaultTopCornerCellNormalizer() {
  return {
    defaultLayout: resolveTopCornerCellDefaultLayout,
    normalizeCell: (
      cell: CornerCellConfigLike,
      cellIndex: number,
      doors: number
    ): NormalizedTopModuleConfigLike => normalizeTopModuleConfigTyped(cell, cellIndex, doors),
  } satisfies NormalizeCornerCellForPatchOptions<NormalizedTopModuleConfigLike>;
}
