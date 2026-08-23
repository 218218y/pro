import type {
  ActionEnvelope,
  ActionMetaLike,
  DispatchOptionsLike,
  RootStateLike,
  StoreLastActionLike,
} from '../../../types';
import type { PatchPayload } from '../../../types/backend_patch_payload';
import type { StoreApi as ZustandStoreApi } from 'zustand/vanilla';

import { normalizeActionMeta, sanitizePatchPayloadForStore } from './store_contract.js';
import {
  asPatchRecord,
  asRecordOrEmpty,
  cloneMetaForWrite,
  collectPayloadSlices,
  normalizeExternalRootState,
  normalizeHelperMeta,
  nowMs,
  readRecordBoolean,
  readRecordNumber,
  readRecordString,
  recordDebugPatchStat,
  type StoreDebugState,
  type UnknownRecord,
} from './store_shared.js';
import {
  applyMetaPatch,
  applyModePatchSlice,
  applyRuntimePatchSlice,
  applyStoreConfigPatch,
  applyUiPatchSlice,
  toConfigSlicePatch,
  toModeSlicePatch,
  toUiSlicePatch,
} from './store_patch_apply.js';
import {
  createCommitNotificationChangeSet,
  createPatchChangeSet,
  createReplaceChangeSet,
  hasStoreChanges,
  type StoreChangeSet,
} from './store_change_set.js';
import {
  assertStoreConfigMapWriteAllowed,
  type StoreConfigMapWriteOptions,
} from '../runtime/store_config_map_write_capability.js';

type DispatchOpts = DispatchOptionsLike & {
  silent?: boolean;
} & StoreConfigMapWriteOptions;

type StoreCommitPipelineDeps = {
  zustandApi: ZustandStoreApi<RootStateLike>;
  getNoneMode: () => string;
  tracePatches: boolean;
  tracePatchThresholdMs: number;
  debugState: StoreDebugState;
  notify: (actionMeta?: ActionMetaLike) => void;
  notifySelectorSubscribers: (actionMeta: ActionMetaLike | undefined, changeSet: StoreChangeSet) => void;
  setLastActionEnvelope: (action: ActionEnvelope<string, unknown> | null) => void;
  recordSlowCommit?: (detail: {
    startTime: number;
    endTime: number;
    durationMs: number;
    type: string;
    source: string;
    slices: string[];
  }) => void;
};

type CommitControlFlags = {
  silent: boolean;
  forceCommit: boolean;
};

function readCommitControlFlags(meta: ActionMetaLike | undefined, opts?: DispatchOpts): CommitControlFlags {
  return {
    silent: !!(opts?.silent || readRecordBoolean(meta, 'silent')),
    forceCommit: readRecordBoolean(meta, 'force') || readRecordBoolean(meta, 'forceBuild'),
  };
}

function hasExplicitMetaDirtyPatch(payload: PatchPayload): boolean {
  const metaPatch = asPatchRecord(asRecordOrEmpty(payload).meta);
  return Object.prototype.hasOwnProperty.call(metaPatch, 'dirty');
}

function shouldAutoMarkConfigDirty(args: {
  configChanged: boolean;
  payload: PatchPayload;
  meta: ActionMetaLike | undefined;
  silent: boolean;
}): boolean {
  const { configChanged, payload, meta, silent } = args;
  if (!asRecordOrEmpty(payload).config) return false;
  if (hasExplicitMetaDirtyPatch(payload)) return false;
  if (silent || readRecordBoolean(meta, 'noPersist')) return false;
  return configChanged;
}

function stampLastActionAndMeta(args: {
  nextState: RootStateLike;
  type: string;
  actionMeta: ActionMetaLike | undefined;
  silent: boolean;
  changeSet: StoreChangeSet;
}): StoreLastActionLike {
  const { nextState, type, actionMeta, silent, changeSet } = args;

  const m = cloneMetaForWrite(nextState);
  m.version = (Number(m.version) | 0) + 1;
  m.updatedAt = Date.now();

  const coalesceMs = readRecordNumber(actionMeta, 'coalesceMs');
  const stamped: StoreLastActionLike = {
    type: type || '',
    source: readRecordString(actionMeta, 'source'),
    immediate: readRecordBoolean(actionMeta, 'immediate'),
    noBuild: readRecordBoolean(actionMeta, 'noBuild'),
    noAutosave: readRecordBoolean(actionMeta, 'noAutosave'),
    noPersist: readRecordBoolean(actionMeta, 'noPersist'),
    noHistory: readRecordBoolean(actionMeta, 'noHistory'),
    force: readRecordBoolean(actionMeta, 'force'),
    forceBuild: readRecordBoolean(actionMeta, 'forceBuild'),
    uiOnly: readRecordBoolean(actionMeta, 'uiOnly'),
    noCapture: readRecordBoolean(actionMeta, 'noCapture'),
    coalesceKey: readRecordString(actionMeta, 'coalesceKey'),
    ...(coalesceMs !== undefined ? { coalesceMs } : {}),
    affectsConfig: changeSet.config,
    affectsUi: changeSet.ui,
    affectsRuntime: changeSet.runtime,
    affectsMode: changeSet.mode,
    affectsMeta: changeSet.meta,
    silent: !!silent,
    ts: m.updatedAt,
  };

  m.lastAction = stamped;
  return { ...stamped };
}

export function createStoreCommitPipeline(deps: StoreCommitPipelineDeps) {
  const {
    zustandApi,
    getNoneMode,
    tracePatches,
    tracePatchThresholdMs,
    debugState,
    notify,
    notifySelectorSubscribers,
    setLastActionEnvelope,
    recordSlowCommit,
  } = deps;

  function recordSlowCommitMaybe(
    startTime: number,
    durationMs: number,
    type: string,
    payload: unknown,
    meta: ActionMetaLike | undefined
  ): void {
    if (!recordSlowCommit || durationMs < tracePatchThresholdMs) return;
    recordSlowCommit({
      startTime,
      endTime: startTime + durationMs,
      durationMs,
      type,
      source: readRecordString(meta, 'source'),
      slices: collectPayloadSlices(payload),
    });
  }

  function commitNextState(
    nextState: RootStateLike,
    type: string,
    payload: unknown,
    actionMeta: ActionMetaLike | undefined,
    silent: boolean,
    changeSet: StoreChangeSet
  ): RootStateLike {
    const stampedMeta = stampLastActionAndMeta({
      nextState,
      type,
      actionMeta,
      silent,
      changeSet,
    });
    debugState.commitCount += 1;
    zustandApi.setState(nextState, true);
    setLastActionEnvelope({
      type,
      payload,
      ...(actionMeta !== undefined ? { meta: actionMeta } : {}),
    });
    const notificationMeta: ActionMetaLike = { ...stampedMeta };
    notifySelectorSubscribers(notificationMeta, createCommitNotificationChangeSet(changeSet));
    if (!silent) notify(notificationMeta);
    return zustandApi.getState();
  }

  function replaceRoot(nextRootIn: unknown, metaIn?: unknown, opts2: DispatchOpts = {}): RootStateLike {
    const meta = normalizeActionMeta(metaIn);
    const { silent, forceCommit } = readCommitControlFlags(meta, opts2);
    const t0 = nowMs();
    const nextRoot = normalizeExternalRootState(nextRootIn, getNoneMode);
    const current = zustandApi.getState();
    const changeSet = createReplaceChangeSet(current, nextRoot);
    if (!forceCommit && !hasStoreChanges(changeSet)) {
      debugState.noopSkipCount += 1;
      return current;
    }
    const out = commitNextState(nextRoot, 'SET', nextRootIn, meta, silent, changeSet);
    const dt = nowMs() - t0;
    recordDebugPatchStat(debugState, 'SET', nextRootIn, meta, dt, tracePatchThresholdMs);
    recordSlowCommitMaybe(t0, dt, 'SET', nextRootIn, meta);
    return out;
  }

  function patchRoot(
    payloadIn: unknown,
    metaIn?: unknown,
    opts2: DispatchOpts = {},
    configApiName = 'store.patch'
  ): RootStateLike {
    const meta = normalizeActionMeta(metaIn);
    const { silent, forceCommit } = readCommitControlFlags(meta, opts2);

    const traceThis = !!(tracePatches || readRecordBoolean(meta, 'traceStorePatch'));
    const t0 = nowMs();

    const payload = sanitizePatchPayloadForStore(payloadIn);
    const current = zustandApi.getState();
    const pld = asRecordOrEmpty(payload);
    const nextUi = pld.ui ? applyUiPatchSlice(current.ui, pld.ui) : current.ui;
    let nextConfig = current.config;
    const nextMode = pld.mode ? applyModePatchSlice(current.mode, pld.mode, getNoneMode) : current.mode;
    const nextRuntime =
      pld.runtime && typeof pld.runtime === 'object'
        ? applyRuntimePatchSlice(current.runtime, pld.runtime)
        : current.runtime;
    const nextMeta =
      pld.meta && typeof pld.meta === 'object' ? applyMetaPatch(current.meta, pld.meta) : current.meta;

    if (pld.config && typeof pld.config === 'object') {
      assertStoreConfigMapWriteAllowed(pld.config, configApiName, opts2);
      nextConfig = applyStoreConfigPatch(current.config, pld.config, meta, nextUi, opts2);
    }

    const nextRoot: RootStateLike = {
      ...current,
      ui: nextUi,
      config: nextConfig,
      runtime: nextRuntime,
      mode: nextMode,
      meta: nextMeta,
    };
    let changeSet = createPatchChangeSet(current, nextRoot);

    if (
      shouldAutoMarkConfigDirty({
        configChanged: changeSet.config,
        payload,
        meta,
        silent,
      }) &&
      nextRoot.meta.dirty !== true
    ) {
      const nextMeta = cloneMetaForWrite(nextRoot);
      nextMeta.dirty = true;
      changeSet = createPatchChangeSet(current, nextRoot);
    }

    if (!forceCommit && !hasStoreChanges(changeSet)) {
      debugState.noopSkipCount += 1;
      return current;
    }

    const out = commitNextState(nextRoot, 'PATCH', payload, meta, silent, changeSet);
    const dt = nowMs() - t0;
    recordDebugPatchStat(debugState, 'PATCH', payload, meta, dt, tracePatchThresholdMs);
    recordSlowCommitMaybe(t0, dt, 'PATCH', payload, meta);

    if (traceThis && dt >= tracePatchThresholdMs) {
      const slices = collectPayloadSlices(payload);
      const src = readRecordString(meta, 'source');
      const flags: string[] = [];
      if (readRecordBoolean(meta, 'noHistory')) flags.push('noHistory');
      if (readRecordBoolean(meta, 'noBuild')) flags.push('noBuild');
      if (readRecordBoolean(meta, 'noAutosave')) flags.push('noAutosave');
      if (readRecordBoolean(meta, 'noPersist')) flags.push('noPersist');
      if (readRecordBoolean(meta, 'noCapture')) flags.push('noCapture');
      if (readRecordBoolean(meta, 'uiOnly')) flags.push('uiOnly');

      const slicesStr = slices.length ? slices.join('+') : 'none';
      const flagsStr = flags.length ? ` flags=${flags.join(',')}` : '';
      const silentStr = silent ? ' silent' : '';
      console.warn(
        `[store.patch] ${dt.toFixed(1)}ms slices=${slicesStr} source=${src}${flagsStr}${silentStr}`
      );
    }

    return out;
  }

  function patch(
    partial?: PatchPayload | UnknownRecord,
    meta2?: unknown,
    opts2?: DispatchOpts
  ): RootStateLike {
    return patchRoot(partial || {}, meta2, opts2 || {});
  }

  function setRoot(nextRootIn?: unknown, meta2?: unknown, opts2?: DispatchOpts): RootStateLike {
    return replaceRoot(nextRootIn || {}, meta2, opts2 || {});
  }

  function setMode(primary: unknown, opts3?: unknown, meta2?: unknown): void {
    const NONE = getNoneMode();
    patchRoot(
      {
        mode: {
          primary: typeof primary === 'string' && primary ? primary : NONE,
          opts: opts3 && typeof opts3 === 'object' ? opts3 : {},
        },
      },
      normalizeHelperMeta('mode', meta2)
    );
  }

  function setRuntime(patchIn: unknown, meta2?: unknown): void {
    patchRoot({ runtime: asPatchRecord(patchIn) }, normalizeHelperMeta('runtime', meta2));
  }

  function setUi(patchIn: unknown, meta2?: unknown): void {
    patchRoot({ ui: toUiSlicePatch(patchIn) }, normalizeHelperMeta('ui', meta2));
  }

  function setConfig(patchIn: unknown, meta2?: unknown, opts2: DispatchOpts = {}): void {
    patchRoot(
      { config: toConfigSlicePatch(patchIn) },
      normalizeHelperMeta('config', meta2),
      opts2,
      'store.setConfig'
    );
  }

  function setModePatch(patchIn: unknown, meta2?: unknown): void {
    patchRoot({ mode: toModeSlicePatch(patchIn) }, normalizeHelperMeta('mode', meta2));
  }

  function setMeta(patchIn: unknown, meta2?: unknown): void {
    patchRoot({ meta: asPatchRecord(patchIn) }, normalizeHelperMeta('meta', meta2));
  }

  function setDirty(isDirty: unknown, meta2?: unknown): void {
    setMeta({ dirty: !!isDirty }, normalizeHelperMeta('dirty', meta2));
  }

  return {
    patchRoot,
    replaceRoot,
    patch,
    setRoot,
    setMode,
    setRuntime,
    setUi,
    setConfig,
    setModePatch,
    setMeta,
    setDirty,
  };
}
