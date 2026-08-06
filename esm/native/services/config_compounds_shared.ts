import type {
  ActionMetaLike,
  AppContainer,
  ConfigCompoundsSeedOptionsLike,
  ConfigStateLike,
  CornerConfigurationLike,
  ModulesConfigurationLike,
  NormalizedCornerConfigurationLike,
} from '../../../types';

import { getState as __getState, getCfg as __getCfg } from '../kernel/api.js';
import { setCfgCornerConfiguration, setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import { readConfigStateFromApp } from '../runtime/config_selectors.js';
import { getConfigRootMaybe } from '../runtime/app_roots_access.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { metaRestore } from '../runtime/meta_profiles_access.js';
import { reportServiceNonFatal } from './service_error_observability.js';

export type ConfigCompoundKey = 'modulesConfiguration' | 'cornerConfiguration';
export type SeedCompoundValueMap = {
  modulesConfiguration: ModulesConfigurationLike;
  cornerConfiguration: CornerConfigurationLike;
};

export interface ConfigCompoundsSeedOptions extends ConfigCompoundsSeedOptionsLike {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isConfigStateLike(value: unknown): value is ConfigStateLike {
  return isRecord(value);
}

export function reportConfigCompoundsNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(App, error, { where: 'native/services/config_compounds', op }, { consoleOutput });
}

export function readConfigStateLike(value: unknown): ConfigStateLike | null {
  return isConfigStateLike(value) ? value : null;
}

export function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getCfgSnapshot(App: AppContainer): ConfigStateLike | null {
  let storeReadError: unknown = null;
  try {
    const root = __getState(App);
    const rootRecord = isRecord(root) ? root : null;
    const fromStore = readConfigStateLike(rootRecord?.config);
    if (fromStore) return fromStore;
  } catch (error) {
    storeReadError = error;
  }

  try {
    const fromSelector = readConfigStateLike(readConfigStateFromApp(App));
    if (fromSelector) return fromSelector;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'readConfigSnapshot', error);
    return null;
  }

  if (storeReadError) {
    reportConfigCompoundsNonFatal(App, 'readStoreConfigSnapshot', storeReadError);
  }
  return null;
}

export function getConcreteCfgSnapshot(App: AppContainer): ConfigStateLike | null {
  let storeReadError: unknown = null;
  try {
    const root = readStoreStateMaybe<Record<string, unknown>>(App);
    const rootRecord = isRecord(root) ? root : null;
    if (rootRecord && Object.prototype.hasOwnProperty.call(rootRecord, 'config')) {
      const fromState = readConfigStateLike(rootRecord.config);
      if (fromState) return fromState;
    }
  } catch (error) {
    storeReadError = error;
  }

  try {
    const fromRoot = readConfigStateLike(getConfigRootMaybe(App));
    if (fromRoot) return fromRoot;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'readConcreteRootConfig', error);
    return null;
  }

  if (storeReadError) {
    reportConfigCompoundsNonFatal(App, 'readConcreteStoreConfig', storeReadError);
  }
  return null;
}

export function getCfgNow(App: AppContainer): ConfigStateLike {
  try {
    return readConfigStateLike(__getCfg(App)) || {};
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'readCurrentConfig', error);
    return {};
  }
}

export function getUiSnapshot(App: AppContainer): Record<string, unknown> | null {
  try {
    const root = __getState(App);
    const rootRecord = isRecord(root) ? root : null;
    return isRecord(rootRecord?.ui) ? rootRecord.ui : null;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, 'readUiSnapshot', error);
    return null;
  }
}

export function defaultCornerConfiguration(): NormalizedCornerConfigurationLike {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: false,
    gridDivisions: 6,
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
  };
}

export function safeClone<T>(App: AppContainer, v: T, defaultValue: T, op: string): T {
  let structuredCloneError: unknown = null;
  try {
    if (typeof structuredClone === 'function') return structuredClone(v);
  } catch (error) {
    structuredCloneError = error;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(v));
    return cloned === undefined ? defaultValue : cloned;
  } catch (error) {
    const exhaustedError = new Error(`[config_compounds] ${op} could not create a detached clone`, {
      cause: structuredCloneError || error,
    });
    reportConfigCompoundsNonFatal(App, `${op}.cloneExhausted`, exhaustedError);
    return defaultValue;
  }
}

export function buildSeedMeta(App: AppContainer, key: ConfigCompoundKey): ActionMetaLike {
  return metaRestore(App, undefined, `boot:seedCompound:${key}`);
}

export function seedIfMissing<K extends ConfigCompoundKey>(
  App: AppContainer,
  snapshotCfg: ConfigStateLike | null,
  key: K,
  val: SeedCompoundValueMap[K]
): boolean {
  const cur = snapshotCfg ? snapshotCfg[key] : undefined;

  let missing = cur === undefined;
  if (key === 'modulesConfiguration') missing = !Array.isArray(cur);
  if (key === 'cornerConfiguration') missing = !(cur && typeof cur === 'object' && !Array.isArray(cur));
  if (!missing) return true;

  try {
    const meta = buildSeedMeta(App, key);
    const result =
      key === 'modulesConfiguration'
        ? setCfgModulesConfiguration(App, val, meta)
        : setCfgCornerConfiguration(App, val, meta);
    if (result === false) {
      reportConfigCompoundsNonFatal(
        App,
        `write.${key}`,
        new Error(`[config_compounds] ${key} writer rejected the seed operation`)
      );
      return false;
    }
    return true;
  } catch (error) {
    reportConfigCompoundsNonFatal(App, `write.${key}`, error);
    return false;
  }
}

export function cloneSeedOptions(
  opts: ConfigCompoundsSeedOptionsLike | undefined
): ConfigCompoundsSeedOptions | undefined {
  return opts ? { ...opts } : undefined;
}
