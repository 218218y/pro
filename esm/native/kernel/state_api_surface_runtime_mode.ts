import type {
  ActionMetaLike,
  AppContainer,
  ModeActionOptsLike,
  ModeActionsNamespaceLike,
  ModeSlicePatch,
  RuntimeActionsNamespaceLike,
  RuntimeActionScalarKey,
  RuntimeActionScalarValueMap,
  RuntimeSlicePatch,
  UnknownRecord,
} from '../../../types';
import { isRuntimeActionScalarKey } from '../../../types/runtime_scalar.js';

import {
  asMeta,
  asModePatch,
  asRuntimePatch,
  buildRuntimeScalarPatch,
  normMeta,
} from './state_api_shared.js';
import type { MetaNs } from './state_api_shared.js';
import { decodePublicModePatch, decodePublicRuntimePatch } from './state_api_public_patch_contract.js';

interface StateApiSurfaceRuntimeModeContext {
  App: AppContainer;
  metaActionsNs: MetaNs | null;
  runtimeNs: RuntimeActionsNamespaceLike;
  modeNs: ModeActionsNamespaceLike;
  commitRuntimePatch: (patch: RuntimeSlicePatch, meta: ActionMetaLike) => unknown;
  commitModePatch: (patch: ModeSlicePatch, meta: ActionMetaLike) => unknown;
  callStoreWriter: (
    methodName: 'setUi' | 'setRuntime' | 'setMode' | 'setModePatch' | 'setConfig' | 'setMeta',
    ...args: readonly unknown[]
  ) => unknown;
  asObj: <T extends object = UnknownRecord>(value: unknown) => T | null;
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
      const patch = decodePublicRuntimePatch(rtPartial, 'actions.runtime.patch');
      return commitRuntimePatch(asRuntimePatch(patch), transientMeta(meta, 'actions.runtime:patch'));
    };
  }
  if (typeof runtimeNs.setScalar !== 'function') {
    runtimeNs.setScalar = function setScalar<K extends RuntimeActionScalarKey>(
      key: K,
      value: RuntimeActionScalarValueMap[K],
      meta?: ActionMetaLike
    ) {
      const k = String(key == null ? '' : key);
      if (!isRuntimeActionScalarKey(k)) {
        throw new Error(
          `[WardrobePro] actions.runtime.setScalar rejects unknown scalar key: ${k || '<empty>'}.`
        );
      }
      if (typeof value === 'function') {
        throw new TypeError('[WardrobePro] actions.runtime.setScalar does not accept function values.');
      }
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
    modeNs.patch = function patch(modePartial?: ModeSlicePatch, meta?: ActionMetaLike) {
      const patch = decodePublicModePatch(modePartial, 'actions.mode.patch');
      return commitModePatch(asModePatch(patch), transientMeta(meta, 'actions.mode:patch'));
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
      const nextPrimary = typeof primary === 'string' && primary ? primary : NONE;
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
