import type {
  ActionEnvelope,
  ActionMetaLike,
  DispatchOptionsLike,
  RootStateLike,
  PatchPayload,
} from '../../../types';
import type { StoreApi as ZustandStoreApi } from 'zustand/vanilla';

import { normalizeActionMeta, sanitizePatchPayloadForStore } from './store_contract.js';
import {
  asPatchRecord,
  asRecordOrEmpty,
  cloneMetaForWrite,
  collectPayloadSlices,
  normalizeHelperMeta,
  nowMs,
  readRecordBoolean,
  readRecordNumber,
  readRecordString,
  recordDebugPatchStat,
  storeMetaValueEqual,
  storeValueEqual,
  type StoreDebugState,
  type UnknownRecord,
} from './store_shared.js';
import {
  applyConfigPatch,
  applyMetaPatch,
  applyModePatchSlice,
  applyRuntimePatchSlice,
  applyUiPatchSlice,
  toConfigSlicePatch,
  toModeSlicePatch,
  toUiSlicePatch,
} from './store_patch_apply.js';
import { ensureRootState } from './store_shared.js';

type DispatchOpts = DispatchOptionsLike & {
  silent?: boolean;
};

type StoreCommitPipelineDeps = {
  zustandApi: ZustandStoreApi<RootStateLike>;
  getNoneMode: () => string;
  tracePatches: boolean;
  tracePatchThresholdMs: number;
  debugState: StoreDebugState;
  notify: (actionMeta?: ActionMetaLike) => void;
  notifySelectorSubscribers: (actionMeta?: ActionMetaLike) => void;
  setLastActionEnvelope: (action: ActionEnvelope<string, unknown> | null) => void;
};

type CommitControlFlags = {
  silent: boolean;
  forceCommit: boolean;
};

function isRootSemanticallyEqual(current: RootStateLike, nextRoot: RootStateLike): boolean {
  return (
    storeValueEqual(current.ui, nextRoot.ui) &&
    storeValueEqual(current.config, nextRoot.config) &&
    storeValueEqual(current.runtime, nextRoot.runtime) &&
    storeValueEqual(current.mode, nextRoot.mode) &&
    storeMetaValueEqual(current.meta, nextRoot.meta)
  );
}

function isNoopPatchedRoot(current: RootStateLike, nextRoot: RootStateLike): boolean {
  if (
    current.ui === nextRoot.ui &&
    current.config === nextRoot.config &&
    current.runtime === nextRoot.runtime &&
    current.mode === nextRoot.mode &&
    current.meta === nextRoot.meta
  ) {
    return true;
  }
  return isRootSemanticallyEqual(current, nextRoot);
}

function isNoopReplacedRoot(current: RootStateLike, nextRoot: RootStateLike): boolean {
  return isRootSemanticallyEqual(current, nextRoot);
}

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

function didConfigSliceSemanticallyChange(current: RootStateLike, nextRoot: RootStateLike): boolean {
  return current.config !== nextRoot.config;
}

function shouldAutoMarkConfigDirty(args: {
  current: RootStateLike;
  nextRoot: RootStateLike;
  payload: PatchPayload;
  meta: ActionMetaLike | undefined;
  silent: boolean;
}): boolean {
  const { current, nextRoot, payload, meta, silent } = args;
  if (!asRecordOrEmpty(payload).config) return false;
  if (hasExplicitMetaDirtyPatch(payload)) return false;
  if (silent || readRecordBoolean(meta, 'noPersist')) return false;
  return didConfigSliceSemanticallyChange(current, nextRoot);
}

function stampLastActionAndMeta(args: {
  nextState: RootStateLike;
  type: string;
  payload: PatchPayload | unknown;
  actionMeta: ActionMetaLike | undefined;
  silent: boolean;
}): ActionMetaLike {
  const { nextState, type, payload, actionMeta, silent } = args;

  const m = cloneMetaForWrite(nextState);
  m.version = (Number(m.version) | 0) + 1;
  m.updatedAt = Date.now();

  const payloadSlices = collectPayloadSlices(payload);
  const stamped: ActionMetaLike = {
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
    coalesceMs: readRecordNumber(actionMeta, 'coalesceMs'),
    affectsConfig: payloadSlices.includes('config'),
    affectsUi: payloadSlices.includes('ui'),
    affectsRuntime: payloadSlices.includes('runtime'),
    affectsMode: payloadSlices.includes('mode'),
    affectsMeta: payloadSlices.includes('meta'),
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
  } = deps;

  function commitNextState(
    nextState: RootStateLike,
    type: string,
    payload: PatchPayload | unknown,
    actionMeta: ActionMetaLike | undefined,
    silent: boolean
  ): RootStateLike {
    const stampedMeta = stampLastActionAndMeta({ nextState, type, payload, actionMeta, silent });
    debugState.commitCount += 1;
    zustandApi.setState(nextState, true);
    setLastActionEnvelope({
      type,
      payload,
      meta: actionMeta,
    });
    notifySelectorSubscribers(stampedMeta);
    if (!silent) notify(stampedMeta);
    return zustandApi.getState();
  }

  function replaceRoot(nextRootIn: unknown, metaIn?: unknown, opts2: DispatchOpts = {}): RootStateLike {
    const meta = normalizeActionMeta(metaIn);
    const { silent, forceCommit } = readCommitControlFlags(meta, opts2);
    const t0 = nowMs();
    const nextRoot = ensureRootState(nextRootIn, getNoneMode, { preserveSourceSliceRefs: false });
    const current = zustandApi.getState();
    if (!forceCommit && isNoopReplacedRoot(current, nextRoot)) {
      debugState.noopSkipCount += 1;
      return current;
    }
    const out = commitNextState(nextRoot, 'SET', nextRootIn, meta, silent);
    recordDebugPatchStat(debugState, 'SET', nextRootIn, meta, nowMs() - t0, tracePatchThresholdMs);
    return out;
  }

  function patchRoot(payloadIn: unknown, metaIn?: unknown, opts2: DispatchOpts = {}): RootStateLike {
    const meta = normalizeActionMeta(metaIn);
    const { silent, forceCommit } = readCommitControlFlags(meta, opts2);

    const traceThis = !!(tracePatches || readRecordBoolean(meta, 'traceStorePatch'));
    const t0 = nowMs();

    const payload = sanitizePatchPayloadForStore(payloadIn);
    const current = zustandApi.getState();
    const next: RootStateLike = { ...current };
    const pld = asRecordOrEmpty(payload);

    if (pld.ui) {
      next.ui = applyUiPatchSlice(current.ui, pld.ui);
    }

    if (pld.config && typeof pld.config === 'object') {
      next.config = applyConfigPatch(current.config, pld.config, meta, current.ui);
    }

    if (pld.mode) {
      next.mode = applyModePatchSlice(current.mode, pld.mode, getNoneMode);
    }

    if (pld.runtime && typeof pld.runtime === 'object') {
      next.runtime = applyRuntimePatchSlice(current.runtime, pld.runtime);
    }

    if (pld.meta && typeof pld.meta === 'object') {
      next.meta = applyMetaPatch(current, pld.meta);
    }

    const nextRoot = ensureRootState(next, getNoneMode);

    if (shouldAutoMarkConfigDirty({ current, nextRoot, payload, meta, silent })) {
      const nextMeta = cloneMetaForWrite(nextRoot);
      nextMeta.dirty = true;
    }

    if (!forceCommit && isNoopPatchedRoot(current, nextRoot)) {
      debugState.noopSkipCount += 1;
      return current;
    }

    const out = commitNextState(nextRoot, 'PATCH', payload, meta, silent);
    const dt = nowMs() - t0;
    recordDebugPatchStat(debugState, 'PATCH', payload, meta, dt, tracePatchThresholdMs);

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
          primary: primary ? String(primary) : NONE,
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

  function setConfig(patchIn: unknown, meta2?: unknown): void {
    patchRoot({ config: toConfigSlicePatch(patchIn) }, normalizeHelperMeta('config', meta2));
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
