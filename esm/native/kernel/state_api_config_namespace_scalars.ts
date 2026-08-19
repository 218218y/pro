import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigActionsNamespaceLike,
  ConfigScalarKey,
  ConfigScalarUpdater,
  ConfigScalarValueMap,
  CornerConfigurationLike,
  ModulesConfigurationLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
} from '../../../types';
import { isConfigScalarKey } from '../../../types/config_scalar.js';

import { asRecord } from '../runtime/record.js';
import { buildConfigPatchWithReplaceMetadata } from '../runtime/cfg_access_patch_metadata.js';
import type { MetaNs } from './state_api_shared.js';
import {
  commitConfigWrite,
  configSlicePatchFromKey,
  readActionMeta,
  readConfigScalarResolver,
  reuseEquivalentValue,
  toConfigPatch,
} from './state_api_config_namespace_shared.js';

interface StateApiConfigNamespaceScalarsContext {
  actions: ActionsNamespaceLike;
  configNs: ConfigActionsNamespaceLike;
  metaActionsNs: MetaNs | null;
  normMeta: (meta: unknown, source: string) => ActionMetaLike;
  safeCall: (fn: () => unknown) => unknown;
  commitConfigPatch: Parameters<typeof commitConfigWrite>[0];
  projectConfigReplaceKeys: Record<string, true>;
}

export function installStateApiConfigNamespaceScalars(ctx: StateApiConfigNamespaceScalarsContext): void {
  const {
    actions,
    configNs,
    metaActionsNs,
    normMeta,
    safeCall,
    commitConfigPatch,
    projectConfigReplaceKeys,
  } = ctx;

  if (typeof configNs.setScalar !== 'function') {
    configNs.setScalar = function setScalar<K extends ConfigScalarKey>(
      key: K,
      valueOrFn: ConfigScalarValueMap[K] | ConfigScalarUpdater<K>,
      meta?: ActionMetaLike
    ) {
      return actions.setCfgScalar?.(key, valueOrFn, normMeta(meta, 'actions.config:setScalar'));
    };
  }

  if (typeof configNs.setCustomUploadedDataURL !== 'function') {
    configNs.setCustomUploadedDataURL = function setCustomUploadedDataURL(
      data: unknown,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setCustomUploadedDataURL');
      const v = typeof data === 'string' ? data : null;
      return actions.setCfgScalar?.('customUploadedDataURL', v, m);
    };
  }

  if (typeof configNs.setModulesConfiguration !== 'function') {
    configNs.setModulesConfiguration = function setModulesConfiguration(
      next: ModulesConfigurationLike,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setModulesConfiguration');
      return actions.setCfgScalar?.('modulesConfiguration', next, m);
    };
  }

  if (typeof configNs.setLowerModulesConfiguration !== 'function') {
    configNs.setLowerModulesConfiguration = function setLowerModulesConfiguration(
      next: ModulesConfigurationLike,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setLowerModulesConfiguration');
      return actions.setCfgScalar?.('stackSplitLowerModulesConfiguration', next, m);
    };
  }

  if (typeof configNs.setCornerConfiguration !== 'function') {
    configNs.setCornerConfiguration = function setCornerConfiguration(
      next: CornerConfigurationLike,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setCornerConfiguration');
      return actions.setCfgScalar?.('cornerConfiguration', next, m);
    };
  }

  if (typeof configNs.setPreChestState !== 'function') {
    configNs.setPreChestState = function setPreChestState(
      next: ProjectPreChestStateLike | null,
      meta?: ActionMetaLike
    ) {
      const m = normMeta(meta, 'actions.config:setPreChestState');
      return actions.setCfgScalar?.('preChestState', next, m);
    };
  }

  if (typeof configNs.setSavedNotes !== 'function') {
    configNs.setSavedNotes = function setSavedNotes(next: ProjectSavedNotesLike, meta?: ActionMetaLike) {
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
    actions.setCfgScalar = function setCfgScalar<K extends ConfigScalarKey>(
      key: K,
      valueOrFn: ConfigScalarValueMap[K] | ConfigScalarUpdater<K>,
      meta?: ActionMetaLike
    ) {
      meta = normMeta(meta, 'actions:setCfgScalar');
      const k = String(key || '');
      if (!isConfigScalarKey(k)) {
        throw new Error(`[WardrobePro] actions.setCfgScalar rejects unknown scalar key: ${k || '<empty>'}.`);
      }
      const snap = asRecord(safeCall(() => configNs.captureSnapshot?.())) || {};
      const prev = snap[k];
      let nextVal: unknown = valueOrFn;
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
      const o = projectConfigReplaceKeys[k]
        ? toConfigPatch(buildConfigPatchWithReplaceMetadata({ [k]: nextVal }, { [k]: true }))
        : configSlicePatchFromKey(k, nextVal);
      return commitConfigWrite(commitConfigPatch, o, meta);
    };
  }
}
