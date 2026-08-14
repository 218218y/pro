import type {
  ActionMetaLike,
  UnknownRecord,
  AppContainer,
  ColorsActionsLike,
  ConfigActionsNamespaceLike,
  SavedColorLike,
  ConfigStateLike,
} from '../../../types';

import { setCfgMultiColorMode } from '../runtime/cfg_access.js';
import {
  writeColorSwatchesOrderOrThrow,
  writeIndividualColor,
  writeSavedColorsOrThrow,
} from '../runtime/maps_access.js';
import { asRecord } from '../runtime/record.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { mutateSavedColorsViaCanonicalRepository } from './maps_api_saved_colors.js';

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
  _cfg: () => ConfigStateLike;
  _map: (mapName: unknown) => UnknownRecord;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

type SavedColorsInput = Array<SavedColorLike | string>;

function normalizeSavedColor(value: unknown): SavedColorLike | string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
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
  const { App, select, colorsActions, configActions, _cfg, _map, _meta } = args;

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
      const k = formatIdentityValue(readIdentityValue(partKey));
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

  const setSavedColors =
    colorsActions.setSavedColors ||
    async function (nextArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setSavedColors');
      const arr = asUnknownArray(nextArr);
      return await writeSavedColorsOrThrow(App, arr, meta);
    };

  colorsActions.setSavedColors = setSavedColors;

  async function mutateSavedColors(
    mutate: (current: SavedColorsInput) => SavedColorsInput,
    meta: ActionMetaLike
  ): Promise<unknown> {
    return await mutateSavedColorsViaCanonicalRepository(
      App,
      current =>
        mutate(normalizeSavedColorsInput(current)).filter(
          (value): value is SavedColorLike => typeof value !== 'string'
        ),
      meta
    );
  }

  colorsActions.setColorSwatchesOrder =
    colorsActions.setColorSwatchesOrder ||
    async function (nextArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:setColorSwatchesOrder');
      const arr = asUnknownArray(nextArr);
      return await writeColorSwatchesOrderOrThrow(App, arr, meta);
    };

  colorsActions.save =
    colorsActions.save ||
    async function (colorObj: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:save');
      const nextColor = normalizeSavedColor(colorObj);
      if (!nextColor) return;
      return await mutateSavedColors(current => current.concat(nextColor), meta);
    };

  colorsActions.deleteSaved =
    colorsActions.deleteSaved ||
    async function (colorId: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:deleteSaved');
      const id = formatIdentityValue(readIdentityValue(colorId));
      if (!id) return;
      return await mutateSavedColors(
        current =>
          current.filter(function (c: unknown) {
            const cid = readColorId(c);
            return !cid || cid !== id;
          }),
        meta
      );
    };

  colorsActions.importMergeSaved =
    colorsActions.importMergeSaved ||
    async function (colorsArr: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:colors:importMergeSaved');
      const incoming = asUnknownArray(colorsArr);
      return await mutateSavedColors(cur => {
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
        cur.concat(incoming as SavedColorsInput).forEach(function (c: unknown) {
          const cid = readColorId(c);
          if (cid && !seen[cid]) {
            const next = normalizeSavedColor(byId[cid]);
            if (next) ordered.push(next);
            seen[cid] = true;
          }
        });
        return ordered;
      }, meta);
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
      return writeIndividualColor(App, partKey, value, meta);
    };

  colorsActions.applyPaint =
    colorsActions.applyPaint ||
    function (
      nextColors: unknown,
      nextCurtains: unknown,
      meta: ActionMetaLike | undefined,
      nextDoorSpecialMap?: unknown,
      nextMirrorLayoutMap?: unknown,
      nextDoorStyleMap?: unknown
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
        nextMirrorLayoutMap,
        nextDoorStyleMap
      );
    };
}
