import type { UnknownRecord } from '../../../types';

import { getUi, isDirty } from './store_access.js';
import { metaUiOnly } from '../runtime/meta_profiles_access.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';

import type {
  KernelSnapshotStoreMetaLike,
  KernelSnapshotStoreSyncOpts,
  KernelSnapshotStoreSystem,
} from './kernel_snapshot_store_contracts.js';
import {
  buildStoreMeta,
  mergeSnapshotOnPrev,
  normalizeSnapshotStoreMeta,
  snapshotStoreValueEqual,
  uiSnapshotValueEqual,
  withDefaultSource,
} from './kernel_snapshot_store_shared.js';
import {
  requestKernelSnapshotBuild,
  scheduleKernelSnapshotAutosave,
  shouldCaptureKernelSnapshotConfig,
} from './kernel_snapshot_store_commits_shared.js';
import type { KernelSnapshotStoreCommitArgs } from './kernel_snapshot_store_commits_shared.js';

export function createKernelSnapshotStoreCommitOpsRuntime(
  args: KernelSnapshotStoreCommitArgs
): Omit<KernelSnapshotStoreSystem, 'getBuildState'> {
  const commitFromSnapshot = (uiSnapshot: unknown, meta?: KernelSnapshotStoreMetaLike): void => {
    try {
      const o = normalizeSnapshotStoreMeta(args.asRecord, meta);
      const store = getStoreSurfaceMaybe(args.App);
      if (!store) return;

      const prevState = store.getState();
      const prevStateRec = args.asRecordOrNull(prevState);
      const prevUi = args.asRecord(prevStateRec?.ui ?? null, {});
      const ui = mergeSnapshotOnPrev(args.asRecord, prevUi, args.asRecord(uiSnapshot, {}));
      const cfg = args.captureConfig ? args.captureConfig() : null;
      const nextCfg = cfg && typeof cfg === 'object' ? args.asRecord(cfg, {}) : undefined;
      const prevCfg = args.asRecord(prevStateRec?.config ?? null, {});
      const uiChanged = !uiSnapshotValueEqual(prevUi, ui);
      const cfgChanged = nextCfg ? !snapshotStoreValueEqual(prevCfg, nextCfg) : false;
      const wroteSnapshot = uiChanged || cfgChanged;

      const source = typeof o.source === 'string' ? o.source : 'ui';
      const shouldForceBuild = !!(o.forceBuild || o.force);
      if (wroteSnapshot) {
        args.setLastCommitAt(Date.now());
        args.setStoreUiSnapshot(args.asRecord(ui, {}), buildStoreMeta(source, o), nextCfg);
      }

      try {
        requestKernelSnapshotBuild(args.App, o, source, shouldForceBuild, wroteSnapshot);
      } catch (_eRequestBuild) {
        args.reportNonFatal('commitFromSnapshot.requestBuild', _eRequestBuild, { throttleMs: 6000 });
      }
      scheduleKernelSnapshotAutosave(args, wroteSnapshot, o);
    } catch (_e) {
      args.reportNonFatal('commitFromSnapshot.outer', _e, { throttleMs: 6000 });
    }
  };

  const syncStore = (opts?: KernelSnapshotStoreSyncOpts | null): void => {
    const o = withDefaultSource(normalizeSnapshotStoreMeta(args.asRecord, opts), 'syncStore');
    const optsRec = args.asRecord(opts, {});
    const base = args.asRecord(getUi(args.App), {});
    let snap: UnknownRecord = base;
    const over = optsRec.override;
    if (over && typeof over === 'object' && !Array.isArray(over)) {
      snap = Object.assign({}, base, args.asRecord(over));
    }

    return commitFromSnapshot(snap, o);
  };

  const setDirty = (isDirtyValue: boolean, meta?: KernelSnapshotStoreMetaLike): void => {
    const m = normalizeSnapshotStoreMeta(args.asRecord, meta);
    const src = typeof m.source === 'string' ? m.source : typeof m.reason === 'string' ? m.reason : 'dirty';
    const dirty = !!isDirtyValue;

    try {
      const store = getStoreSurfaceMaybe(args.App);
      const setDirty = store && typeof store.setDirty === 'function' ? store.setDirty : null;
      if (setDirty) {
        setDirty.call(
          store,
          dirty,
          metaUiOnly(args.App, Object.assign({ source: src }, m), 'kernel:setDirty')
        );
      }
    } catch {
      // ignore store dirty failures
    }

    args.setLastDirtyReason(String(m.reason ?? m.source ?? ''));
  };

  const isDirtyState = () => isDirty(args.App);

  const markDirty = (reason: unknown) => {
    setDirty(true, { source: 'dirty', reason: String(reason || '') });
  };

  const clearDirty = (reason: unknown) => {
    setDirty(false, { source: 'clean', reason: String(reason || '') });
  };

  const touch = (meta?: KernelSnapshotStoreMetaLike): void => {
    const m = withDefaultSource(normalizeSnapshotStoreMeta(args.asRecord, meta), 'touch');
    try {
      args.touchStore(buildStoreMeta(m.source || 'touch', m));
    } catch {
      // ignore touch failures
    }
  };

  const commit = (meta?: KernelSnapshotStoreMetaLike): void => {
    try {
      const m = withDefaultSource(normalizeSnapshotStoreMeta(args.asRecord, meta), 'commit');
      const source = m.source || 'commit';

      if (!m.noPersist) markDirty(source);

      commitFromSnapshot(args.asRecord(getUi(args.App), {}), m);
    } catch (_e) {
      args.reportNonFatal('commit.outer', _e, { throttleMs: 6000 });
    }
  };

  const persist = (meta?: KernelSnapshotStoreMetaLike): void => {
    try {
      const m0 = withDefaultSource(normalizeSnapshotStoreMeta(args.asRecord, meta), 'persist');
      const noBuildDefaulted = typeof m0.noBuild === 'undefined' ? true : !!m0.noBuild;
      const m: KernelSnapshotStoreMetaLike = { ...m0, noBuild: noBuildDefaulted };

      const src = m.source || 'persist';
      const captureConfig = shouldCaptureKernelSnapshotConfig(src, m);

      if (captureConfig && getStoreSurfaceMaybe(args.App)) {
        commitFromSnapshot(args.asRecord(getUi(args.App), {}), m);
        return;
      }

      if (!m.noPersist) markDirty(src);
      touch(m);
      return;
    } catch (__wpErr) {
      args.reportNonFatal('esm/native/kernel/kernel.ts:L2502', __wpErr, { throttleMs: 4000 });
    }
  };

  return {
    commitFromSnapshot,
    syncStore,
    setDirty,
    isDirty: isDirtyState,
    markDirty,
    clearDirty,
    touch,
    commit,
    persist,
  };
}
