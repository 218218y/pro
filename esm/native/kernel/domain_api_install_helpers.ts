import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  RuntimeStateLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

import { applyConfigPatch, patchConfigMap } from '../runtime/cfg_access.js';
import { metaMerge } from '../runtime/meta_profiles_access.js';
import { readMap } from '../runtime/maps_access.js';
import { getCfg, getRuntime, getUi } from './store_access.js';
import { asActionMeta, asDomainObject, domainApiReportNonFatal } from './domain_api_shared.js';

export type DomainApiInstallHelpers = {
  readConfig: () => ConfigStateLike;
  readUi: () => UiStateLike;
  readRuntime: () => RuntimeStateLike;
  captureConfigSnapshot: () => UnknownRecord;
  createMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  readMapSnapshot: (mapName: unknown) => UnknownRecord;
  patchConfigMapValue: (mapName: unknown, key: unknown, value: unknown, meta?: ActionMetaLike) => unknown;
  reportNonFatal: (op: string, error: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => void;
};

type CreateDomainApiInstallHelpersArgs = {
  App: AppContainer;
  configActions: UnknownRecord;
};

export function createDomainApiInstallHelpers(
  args: CreateDomainApiInstallHelpersArgs
): DomainApiInstallHelpers {
  const { App, configActions } = args;

  const readConfig = (): ConfigStateLike => getCfg(App);
  const readUi = (): UiStateLike => getUi(App);
  const readRuntime = (): RuntimeStateLike => getRuntime(App);

  const captureConfigSnapshot = (): UnknownRecord => {
    try {
      if (typeof configActions.captureSnapshot === 'function') {
        const snap = configActions.captureSnapshot();
        return asDomainObject(snap) || {};
      }
    } catch (error) {
      domainApiReportNonFatal(App, 'captureConfigSnapshot', error, { throttleMs: 2000 });
    }
    return readConfig();
  };

  const createMeta = (
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    source: string
  ): ActionMetaLike => metaMerge(App, asActionMeta(meta), undefined, source || 'domain:meta');

  const readMapSnapshot = (mapName: unknown): UnknownRecord => {
    const name = String(mapName || '');
    const fromRuntime = readMap(App, name);
    if (fromRuntime) return fromRuntime;
    const cfg = readConfig();
    const value = cfg ? cfg[name] : null;
    return asDomainObject(value) || {};
  };

  const patchConfigMapValue = (
    mapName: unknown,
    key: unknown,
    value: unknown,
    meta?: ActionMetaLike
  ): unknown => {
    const mapKey = String(mapName || '');
    const recordKey = String(key || '');
    if (!mapKey || !recordKey) return undefined;
    const mergedMeta = createMeta(meta, 'actions:cfgMapPatch:' + mapKey);
    const patch: UnknownRecord = { [recordKey]: value };
    return patchConfigMap(App, mapKey, patch, mergedMeta);
  };

  void applyConfigPatch;

  return {
    readConfig,
    readUi,
    readRuntime,
    captureConfigSnapshot,
    createMeta,
    readMapSnapshot,
    patchConfigMapValue,
    reportNonFatal: (op, error, opts) => domainApiReportNonFatal(App, op, error, opts),
  };
}
