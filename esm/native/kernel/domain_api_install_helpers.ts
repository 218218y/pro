import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  RuntimeStateLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

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

  return {
    readConfig,
    readUi,
    readRuntime,
    captureConfigSnapshot,
    createMeta,
    readMapSnapshot,
    reportNonFatal: (op, error, opts) => domainApiReportNonFatal(App, op, error, opts),
  };
}
