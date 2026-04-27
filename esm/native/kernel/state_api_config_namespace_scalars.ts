import type { ActionMetaLike, ActionsNamespaceLike, ConfigActionsNamespaceLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import type { MetaNs } from './state_api_shared.js';
import {
  commitConfigWrite,
  configSlicePatchFromKey,
  readActionMeta,
  readConfigScalarResolver,
  reuseEquivalentValue,
} from './state_api_config_namespace_shared.js';

interface StateApiConfigNamespaceScalarsContext {
  actions: ActionsNamespaceLike;
  configNs: ConfigActionsNamespaceLike;
  metaActionsNs: MetaNs | null;
  normMeta(meta: unknown, source: string): ActionMetaLike;
  safeCall(fn: () => unknown): unknown;
  commitConfigPatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
}

export function installStateApiConfigNamespaceScalars(ctx: StateApiConfigNamespaceScalarsContext): void {
  const { actions, configNs, metaActionsNs, normMeta, safeCall, commitConfigPatch } = ctx;

  if (typeof configNs.setScalar !== 'function') {
    configNs.setScalar = function setScalar(key: string, valueOrFn: unknown, meta?: ActionMetaLike) {
      return actions.setCfgScalar?.(String(key || ''), valueOrFn, normMeta(meta, 'actions.config:setScalar'));
    };
  }

  if (typeof configNs.setCustomUploadedDataURL !== 'function') {
    configNs.setCustomUploadedDataURL = function setCustomUploadedDataURL(
      data: unknown,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setCustomUploadedDataURL');
      const v = data == null ? null : String(data || '');
      return actions.setCfgScalar?.('customUploadedDataURL', v, m);
    };
  }

  if (typeof configNs.setModulesConfiguration !== 'function') {
    configNs.setModulesConfiguration = function setModulesConfiguration(
      next: unknown,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setModulesConfiguration');
      return actions.setCfgScalar?.('modulesConfiguration', next, m);
    };
  }

  if (typeof configNs.setLowerModulesConfiguration !== 'function') {
    configNs.setLowerModulesConfiguration = function setLowerModulesConfiguration(
      next: unknown,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setLowerModulesConfiguration');
      return actions.setCfgScalar?.('stackSplitLowerModulesConfiguration', next, m);
    };
  }

  if (typeof configNs.setCornerConfiguration !== 'function') {
    configNs.setCornerConfiguration = function setCornerConfiguration(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setCornerConfiguration');
      return actions.setCfgScalar?.('cornerConfiguration', next, m);
    };
  }

  if (typeof configNs.setPreChestState !== 'function') {
    configNs.setPreChestState = function setPreChestState(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setPreChestState');
      return actions.setCfgScalar?.('preChestState', next, m);
    };
  }

  if (typeof configNs.setSavedNotes !== 'function') {
    configNs.setSavedNotes = function setSavedNotes(next: unknown, meta?: ActionMetaLike) {
      const metaNsLocal: MetaNs | null = metaActionsNs;
      const metaIn = readActionMeta(meta);
      const m: ActionMetaLike =
        metaNsLocal && typeof metaNsLocal.noBuild === 'function'
          ? metaNsLocal.noBuild(metaIn, 'actions.config:setSavedNotes')
          : normMeta(metaIn, 'actions.config:setSavedNotes');
      if (typeof m.coalesceKey === 'undefined') m.coalesceKey = 'notes';
      if (typeof m.coalesceMs === 'undefined') m.coalesceMs = 1200;
      return actions.setCfgScalar?.('savedNotes', next, m);
    };
  }

  if (typeof actions.setCfgScalar !== 'function') {
    actions.setCfgScalar = function setCfgScalar(key: string, valueOrFn: unknown, meta?: ActionMetaLike) {
      meta = normMeta(meta, 'actions:setCfgScalar');
      const k = String(key || '');
      if (!k) return undefined;
      const snap = asRecord(safeCall(() => configNs.captureSnapshot?.())) || {};
      const prev = snap[k];
      let nextVal = valueOrFn;
      if (typeof valueOrFn === 'function') {
        try {
          const resolveNextValue = readConfigScalarResolver(valueOrFn);
          nextVal = resolveNextValue ? resolveNextValue(prev, snap) : undefined;
        } catch (_e) {
          return undefined;
        }
      }
      nextVal = reuseEquivalentValue(prev, nextVal);
      if (Object.is(prev, nextVal)) return prev;
      const o = configSlicePatchFromKey(k, nextVal);
      return commitConfigWrite(commitConfigPatch, o, meta);
    };
  }
}
