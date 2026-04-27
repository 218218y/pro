import type {
  ActionMetaLike,
  UnknownRecord,
  AppContainer,
  ColorsActionsLike,
  ConfigActionsNamespaceLike,
  SavedColorLike,
} from '../../../types';

import { setCfgColorSwatchesOrder, setCfgMultiColorMode, setCfgSavedColors } from '../runtime/cfg_access.js';
import { writeColorSwatchesOrder, writeSavedColors } from '../runtime/maps_access.js';
import { asRecord } from '../runtime/record.js';

type ColorsSelect = UnknownRecord & {
  isMultiMode?: () => boolean;
  individualMap?: () => UnknownRecord;
  get?: (partKey: unknown) => unknown;
  saved?: () => unknown[];
};

interface InstallDomainApiColorsSectionArgs {
  App: AppContainer;
  select: UnknownRecord & { colors: ColorsSelect };
  colorsActions: ColorsActionsLike;
  configActions: ConfigActionsNamespaceLike;
  _cfg(): UnknownRecord;
  _map(mapName: unknown): UnknownRecord;
  _meta(meta: unknown, source: string): ActionMetaLike;
  _cfgMapPatch(mapName: unknown, key: unknown, val: unknown, meta?: ActionMetaLike): unknown;
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

type SavedColorsInput = Array<SavedColorLike | string>;

function normalizeSavedColor(value: unknown): SavedColorLike | string | null {
  if (typeof value === 'string') {
    const legacy = value.trim();
    return legacy || null;
  }
  const rec = asRecord(value);
  if (!rec) return null;
  const id = typeof rec.id === 'string' ? rec.id.trim() : '';
  if (!id) return null;
  const next: SavedColorLike = { id };
  if (typeof rec.type === 'string' && rec.type) next.type = rec.type;
  if (typeof rec.value === 'string') next.value = rec.value;
  if (typeof rec.textureData !== 'undefined') next.textureData = rec.textureData;
  return next;
}

function normalizeSavedColorsInput(value: unknown): SavedColorsInput {
  if (!Array.isArray(value)) return [];
  const out: SavedColorsInput = [];
  for (const entry of value) {
    const next = normalizeSavedColor(entry);
    if (next) out.push(next);
  }
  return out;
}

function readColorId(x: unknown): string | null {
  const rec = asRecord(x);
  if (!rec) return null;
  const id = rec.id;
  if (typeof id === 'string') return id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

export function installDomainApiColorsSection(args: InstallDomainApiColorsSectionArgs): void {
  const { App, select, colorsActions, configActions, _cfg, _map, _meta, _cfgMapPatch } = args;

  select.colors.isMultiMode =
    select.colors.isMultiMode ||
    function () {
      const cfg = _cfg();
      return !!(cfg && cfg.isMultiColorMode);
    };

  select.colors.individualMap =
    select.colors.individualMap ||
    function () {
      return _map('individualColors');
    };

  select.colors.get =
    select.colors.get ||
    function (partKey: unknown) {
      const m = readIndividualColorsMap();
      if (!m || typeof m !== 'object') return null;
      const k = String(partKey || '');
      return k && k in m ? m[k] : null;
    };

  select.colors.saved =
    select.colors.saved ||
    function () {
      const cfg = _cfg();
      const arr = cfg.savedColors;
      return Array.isArray(arr) ? arr : [];
    };

  function readIndividualColorsMap(): UnknownRecord {
    if (typeof select.colors.individualMap !== 'function') return {};
    return asRecord(select.colors.individualMap()) || {};
  }

  function readSavedColors(): SavedColorsInput {
    return normalizeSavedColorsInput(typeof select.colors.saved === 'function' ? select.colors.saved() : []);
  }

  const setSavedColors =
    colorsActions.setSavedColors ||
    function (nextArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setSavedColors');
      const arr = asUnknownArray(nextArr);
      if (writeSavedColors(App, arr, meta)) return;
      return setCfgSavedColors(App, arr, meta);
    };

  colorsActions.setSavedColors = setSavedColors;

  colorsActions.setColorSwatchesOrder =
    colorsActions.setColorSwatchesOrder ||
    function (nextArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setColorSwatchesOrder');
      const arr = asUnknownArray(nextArr);
      if (writeColorSwatchesOrder(App, arr, meta)) return;
      return setCfgColorSwatchesOrder(App, arr, meta);
    };

  colorsActions.save =
    colorsActions.save ||
    function (colorObj: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:save');
      const cur = readSavedColors().slice();
      const nextColor = normalizeSavedColor(colorObj);
      if (nextColor) cur.push(nextColor);
      return setSavedColors(cur, meta);
    };

  colorsActions.deleteSaved =
    colorsActions.deleteSaved ||
    function (colorId: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:deleteSaved');
      const id = String(colorId || '');
      if (!id) return;
      const cur = readSavedColors();
      const next: SavedColorsInput = cur.filter(function (c: unknown) {
        const cid = readColorId(c);
        return !cid || cid !== id;
      });
      return setSavedColors(next, meta);
    };

  colorsActions.importMergeSaved =
    colorsActions.importMergeSaved ||
    function (colorsArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:importMergeSaved');
      const incoming = asUnknownArray(colorsArr);
      const cur = readSavedColors();

      const byId: Record<string, unknown> = {};
      cur.forEach(function (c: unknown) {
        const cid = readColorId(c);
        if (cid) byId[cid] = c;
      });
      incoming.forEach(function (c: unknown) {
        const cid = readColorId(c);
        if (cid) byId[cid] = c;
      });

      const seen: Record<string, boolean> = {};
      const ordered: SavedColorsInput = [];
      cur.forEach(function (c: unknown) {
        const cid = readColorId(c);
        if (cid && !seen[cid]) {
          const next = normalizeSavedColor(byId[cid]);
          if (next) ordered.push(next);
          seen[cid] = true;
        }
      });
      incoming.forEach(function (c: unknown) {
        const cid = readColorId(c);
        if (cid && !seen[cid]) {
          const next = normalizeSavedColor(byId[cid]);
          if (next) ordered.push(next);
          seen[cid] = true;
        }
      });

      return setSavedColors(ordered, meta);
    };

  colorsActions.setMultiMode =
    colorsActions.setMultiMode ||
    function (isOn: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setMultiMode');
      return setCfgMultiColorMode(App, !!isOn, meta);
    };

  colorsActions.setIndividual =
    colorsActions.setIndividual ||
    function (partKey: unknown, value: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setIndividual');
      return _cfgMapPatch('individualColors', String(partKey || ''), value, meta);
    };

  colorsActions.applyPaint =
    colorsActions.applyPaint ||
    function (
      nextColors: unknown,
      nextCurtains: unknown,
      meta: ActionMetaLike | undefined,
      nextDoorSpecialMap?: unknown,
      nextMirrorLayoutMap?: unknown
    ) {
      meta = _meta(meta, 'actions:colors:applyPaint');
      if (typeof configActions.applyPaintSnapshot !== 'function') {
        throw new Error('Missing actions.config.applyPaintSnapshot');
      }
      return configActions.applyPaintSnapshot(
        nextColors,
        nextCurtains,
        meta,
        nextDoorSpecialMap,
        nextMirrorLayoutMap
      );
    };
}
