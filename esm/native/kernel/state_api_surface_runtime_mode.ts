import type {
  ActionMetaLike,
  AppContainer,
  ModeActionOptsLike,
  ModeActionsNamespaceLike,
  RuntimeActionsNamespaceLike,
  RuntimeScalarKey,
  RuntimeScalarValueMap,
  RuntimeSlicePatch,
  UnknownRecord,
} from '../../../types';

import {
  asMeta,
  asModePatch,
  asRuntimePatch,
  buildRuntimeScalarPatch,
  normMeta,
} from './state_api_shared.js';
import type { MetaNs } from './state_api_shared.js';

interface StateApiSurfaceRuntimeModeContext {
  App: AppContainer;
  metaActionsNs: MetaNs | null;
  runtimeNs: RuntimeActionsNamespaceLike;
  modeNs: ModeActionsNamespaceLike;
  commitRuntimePatch(patch: RuntimeSlicePatch, meta: ActionMetaLike): unknown;
  commitModePatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
  callStoreWriter(
    methodName: 'setUi' | 'setRuntime' | 'setMode' | 'setModePatch' | 'setConfig' | 'setMeta',
    ...args: readonly unknown[]
  ): unknown;
  asObj<T extends object = UnknownRecord>(value: unknown): T | null;
}

export function installStateApiRuntimeModeSurface(ctx: StateApiSurfaceRuntimeModeContext): void {
  const {
    App,
    metaActionsNs,
    runtimeNs,
    modeNs,
    commitRuntimePatch,
    commitModePatch,
    callStoreWriter,
    asObj,
  } = ctx;
  const transientMeta = (
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    source: string
  ): ActionMetaLike => {
    const metaIn = asMeta(meta);
    return metaActionsNs && typeof metaActionsNs.transient === 'function'
      ? metaActionsNs.transient(metaIn, source)
      : normMeta(metaIn, source);
  };

  if (typeof runtimeNs.patch !== 'function') {
    runtimeNs.patch = function patch(rtPartial?: RuntimeSlicePatch, meta?: ActionMetaLike) {
      return commitRuntimePatch(asRuntimePatch(rtPartial), transientMeta(meta, 'actions.runtime:patch'));
    };
  }
  if (typeof runtimeNs.setScalar !== 'function') {
    runtimeNs.setScalar = function setScalar<K extends RuntimeScalarKey>(
      key: K | string,
      value: RuntimeScalarValueMap[RuntimeScalarKey] | unknown,
      meta?: ActionMetaLike
    ) {
      const k = String(key == null ? '' : key);
      if (!k || typeof value === 'function') return undefined;
      return runtimeNs.patch?.(
        buildRuntimeScalarPatch(k, value),
        normMeta(meta, 'actions.runtime:setScalar')
      );
    };
  }
  if (typeof runtimeNs.setSketchMode !== 'function') {
    runtimeNs.setSketchMode = function setSketchMode(value: boolean, meta?: ActionMetaLike) {
      return runtimeNs.setScalar?.('sketchMode', !!value, meta);
    };
  }
  if (typeof runtimeNs.setGlobalClickMode !== 'function') {
    runtimeNs.setGlobalClickMode = function setGlobalClickMode(value: boolean, meta?: ActionMetaLike) {
      return runtimeNs.setScalar?.('globalClickMode', !!value, meta);
    };
  }
  if (typeof runtimeNs.setRestoring !== 'function') {
    runtimeNs.setRestoring = function setRestoring(value: boolean, meta?: ActionMetaLike) {
      return runtimeNs.setScalar?.('restoring', !!value, meta);
    };
  }
  if (typeof runtimeNs.setSystemReady !== 'function') {
    runtimeNs.setSystemReady = function setSystemReady(value: boolean, meta?: ActionMetaLike) {
      return runtimeNs.setScalar?.('systemReady', !!value, meta);
    };
  }
  if (typeof modeNs.patch !== 'function') {
    modeNs.patch = function patch(modePartial?: Record<string, unknown>, meta?: ActionMetaLike) {
      return commitModePatch(asModePatch(modePartial), transientMeta(meta, 'actions.mode:patch'));
    };
  }
  if (typeof modeNs.set !== 'function') {
    modeNs.set = function set(primary: unknown, opts?: ModeActionOptsLike, meta?: ActionMetaLike) {
      const cleanOpts = asObj<ModeActionOptsLike>(opts) || {};
      const modes = asObj(App['modes']);
      const NONE =
        modes && typeof modes['NONE'] === 'string' && String(modes['NONE']).trim()
          ? String(modes['NONE'])
          : 'none';
      const nextPrimary = primary ? String(primary) : NONE;
      const mergedMeta = transientMeta(meta, 'actions.mode:set');
      const out = callStoreWriter('setMode', nextPrimary, cleanOpts, mergedMeta);
      if (out !== undefined) return out;
      return modeNs.patch?.({ primary: nextPrimary, opts: cleanOpts }, mergedMeta);
    };
  }
  if (typeof runtimeNs.setDoorsOpen !== 'function') {
    runtimeNs.setDoorsOpen = function setDoorsOpen(
      open: boolean,
      optsOrMeta?: UnknownRecord | ActionMetaLike,
      metaMaybe?: ActionMetaLike
    ) {
      const optsRecord = asObj(optsOrMeta);
      const hasOpts = !!(
        optsRecord &&
        (Object.prototype.hasOwnProperty.call(optsRecord, 'touch') ||
          Object.prototype.hasOwnProperty.call(optsRecord, 'ts'))
      );
      const opts = hasOpts ? optsRecord : null;
      const meta = hasOpts ? metaMaybe : asMeta(optsOrMeta);
      const patch: RuntimeSlicePatch = { doorsOpen: !!open };
      if (opts && opts.touch) {
        patch.doorsLastToggleTime =
          typeof opts.ts === 'number' && Number.isFinite(opts.ts) ? Number(opts.ts) : Date.now();
      }
      return runtimeNs.patch?.(patch, normMeta(meta, 'actions.runtime:setDoorsOpen'));
    };
  }
}
