import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigActionsNamespaceLike,
  ModulesGeometrySnapshotLike,
  RootStoreLike,
  UnknownRecord,
} from '../../../types';

import {
  canonicalizeComparableProjectConfigPatch,
  canonicalizeComparableProjectConfigSnapshot,
} from './kernel_project_config_snapshot_canonical.js';
import { materializeTopModulesConfigurationFromUiConfig } from '../features/modules_configuration/modules_config_api.js';
import { cfgPatchWithReplaceKeys } from '../runtime/cfg_access.js';
import { asRecord, isRecord } from '../runtime/record.js';
import {
  asConfigPatch,
  buildConfigPatch,
  commitConfigWrite,
  readUnknownArray,
  toConfigPatch,
} from './state_api_config_namespace_shared.js';

interface StateApiConfigNamespaceCoreContext {
  actions: ActionsNamespaceLike;
  configNs: ConfigActionsNamespaceLike;
  store: RootStoreLike;
  readCfgSnapshot(): UnknownRecord;
  readUiSnapshot(): UnknownRecord;
  normMeta(meta: unknown, source: string): ActionMetaLike;
  safeCall(fn: () => unknown): unknown;
  shallowCloneObj(v: unknown): UnknownRecord;
  commitConfigPatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
  projectConfigReplaceKeys: Record<string, true>;
  modulesGeometryReplaceKeys: Record<string, true>;
}

export function installStateApiConfigNamespaceCore(ctx: StateApiConfigNamespaceCoreContext): void {
  const {
    actions,
    configNs,
    store,
    readCfgSnapshot,
    readUiSnapshot,
    normMeta,
    safeCall,
    shallowCloneObj,
    commitConfigPatch,
    projectConfigReplaceKeys,
    modulesGeometryReplaceKeys,
  } = ctx;

  const cloneCanonicalConfigSnapshot = (cfgValue: unknown): UnknownRecord => {
    const src = isRecord(cfgValue) ? shallowCloneObj(cfgValue) : {};
    return canonicalizeComparableProjectConfigSnapshot(src, {
      uiSnapshot: readUiSnapshot(),
      cfgSnapshot: { ...readCfgSnapshot(), ...src },
      cornerMode: 'auto',
      topMode: 'materialize',
    });
  };

  const canonicalizeProjectConfigPatch = (snapshot: unknown): UnknownRecord => {
    const src = isRecord(snapshot) ? shallowCloneObj(snapshot) : {};
    if (!Object.keys(src).length) return src;
    return canonicalizeComparableProjectConfigPatch(src, {
      uiSnapshot: readUiSnapshot(),
      cfgSnapshot: { ...readCfgSnapshot(), ...src },
      cornerMode: 'auto',
      topMode: 'materialize',
    });
  };

  if (typeof actions.applyConfig !== 'function') {
    actions.applyConfig = function applyConfig(cfg?: UnknownRecord, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions:applyConfig');
      const p = asRecord(cfg) ?? {};
      if (typeof configNs.patch === 'function') {
        safeCall(() => configNs.patch?.(p, m));
        return p;
      }
      return commitConfigWrite(commitConfigPatch, buildConfigPatch(p), m);
    };
  }

  if (typeof configNs.captureSnapshot !== 'function') {
    configNs.captureSnapshot = function captureSnapshot() {
      const root = asRecord(store.getState());
      const cfg = root ? root['config'] : null;
      if (isRecord(cfg)) return cloneCanonicalConfigSnapshot(cfg);
      return {};
    };
  }

  if (typeof configNs.get !== 'function') {
    configNs.get = function get() {
      return configNs.captureSnapshot?.() || {};
    };
  }

  if (typeof configNs.map !== 'function') {
    configNs.map = function map(mapName: unknown) {
      const key = String(mapName || '');
      if (!key) return {};
      const snap = asRecord(safeCall(() => configNs.captureSnapshot?.())) || {};
      const v = snap[key];
      return isRecord(v) ? shallowCloneObj(v) : {};
    };
  }

  if (typeof configNs.patch !== 'function') {
    configNs.patch = function patch(cfg?: UnknownRecord, meta?: ActionMetaLike) {
      const cfgRec = asConfigPatch(cfg);
      const m = normMeta(meta, 'actions.config:patch');
      return commitConfigWrite(commitConfigPatch, cfgRec, m);
    };
  }

  if (typeof configNs.applyProjectSnapshot !== 'function') {
    configNs.applyProjectSnapshot = function applyProjectSnapshot(
      snapshot: UnknownRecord,
      meta?: ActionMetaLike
    ) {
      const snap = canonicalizeProjectConfigPatch(snapshot);
      const patch = toConfigPatch(cfgPatchWithReplaceKeys(snap, projectConfigReplaceKeys));
      const m = normMeta(meta, 'actions.config:applyProjectSnapshot');
      return commitConfigWrite(commitConfigPatch, patch, m);
    };
  }

  if (typeof configNs.applyModulesGeometrySnapshot !== 'function') {
    configNs.applyModulesGeometrySnapshot = function applyModulesGeometrySnapshot(
      snapshot: ModulesGeometrySnapshotLike,
      meta?: ActionMetaLike
    ) {
      const snap = isRecord(snapshot) ? shallowCloneObj(snapshot) : {};
      if (!Object.prototype.hasOwnProperty.call(snap, 'modulesConfiguration')) return undefined;

      const basePatch: UnknownRecord = {
        modulesConfiguration: materializeTopModulesConfigurationFromUiConfig(
          Array.isArray(snap.modulesConfiguration)
            ? readUnknownArray(snap.modulesConfiguration)
            : snap.modulesConfiguration,
          readUiSnapshot(),
          {
            ...readCfgSnapshot(),
            ...snap,
          }
        ),
      };
      if (Object.prototype.hasOwnProperty.call(snap, 'isManualWidth'))
        basePatch.isManualWidth = !!snap.isManualWidth;
      if (Object.prototype.hasOwnProperty.call(snap, 'wardrobeWidth'))
        basePatch.wardrobeWidth = snap.wardrobeWidth;
      if (Object.prototype.hasOwnProperty.call(snap, 'wardrobeHeight'))
        basePatch.wardrobeHeight = snap.wardrobeHeight;
      if (Object.prototype.hasOwnProperty.call(snap, 'wardrobeDepth'))
        basePatch.wardrobeDepth = snap.wardrobeDepth;

      const patch = toConfigPatch(cfgPatchWithReplaceKeys(basePatch, modulesGeometryReplaceKeys));
      const m = normMeta(meta, 'actions.config:applyModulesGeometrySnapshot');
      return commitConfigWrite(commitConfigPatch, patch, m);
    };
  }
}
