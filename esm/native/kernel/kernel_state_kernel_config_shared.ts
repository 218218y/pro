import type {
  AppContainer,
  ActionMetaLike,
  ConfigSlicePatch,
  StateKernelLike,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';

import { getCfg } from './store_access.js';
import type { ModulesConfigBucketKey } from '../features/modules_configuration/modules_config_api.js';

export interface KernelStateKernelConfigContext {
  App: AppContainer;
  __sk: StateKernelLike & UnknownRecord;
  asMeta: (meta: unknown) => ActionMetaLike;
  asRecord: (x: unknown, defaultValue?: UnknownRecord) => UnknownRecord;
  isRecord: (x: unknown) => x is UnknownRecord;
  isFn: (x: unknown) => x is UnknownCallable;
  cloneKernelValue: (App: AppContainer, v: unknown, defaultValue?: unknown) => unknown;
  setStoreConfigPatch: (App: AppContainer, patch: ConfigSlicePatch, meta: ActionMetaLike) => boolean;
}

export interface KernelStateKernelConfigHelpers extends KernelStateKernelConfigContext {
  clone: (v: unknown, defaultValue?: unknown) => unknown;
  asBucketKey: (name: string) => ModulesConfigBucketKey;
  readStoreConfigSnapshot: () => UnknownRecord;
}

export function createKernelStateKernelConfigHelpers(
  ctx: KernelStateKernelConfigContext
): KernelStateKernelConfigHelpers {
  const { App, __sk, asMeta, asRecord, isRecord, isFn, cloneKernelValue, setStoreConfigPatch } = ctx;

  const clone = (v: unknown, defaultValue?: unknown) => cloneKernelValue(App, v, defaultValue);
  const asBucketKey = (name: string): ModulesConfigBucketKey =>
    name === 'stackSplitLowerModulesConfiguration'
      ? 'stackSplitLowerModulesConfiguration'
      : 'modulesConfiguration';
  const readStoreConfigSnapshot = (): UnknownRecord =>
    __sk && typeof __sk.getStoreConfig === 'function'
      ? asRecord(__sk.getStoreConfig() || {}, {})
      : asRecord(getCfg(App), {});

  return {
    App,
    __sk,
    asMeta,
    asRecord,
    isRecord,
    isFn,
    cloneKernelValue,
    setStoreConfigPatch,
    clone,
    asBucketKey,
    readStoreConfigSnapshot,
  };
}
