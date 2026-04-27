import type { ActionMetaLike } from '../../../types';

import { isActionStubFn } from '../runtime/actions_access_shared.js';

import type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';

const META_INTERACTIVE: ActionMetaLike = { silent: false };
const META_UI_ONLY: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
  uiOnly: true,
};
const META_RESTORE: ActionMetaLike = {
  silent: true,
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};
const META_NO_HISTORY: ActionMetaLike = { noHistory: true, noCapture: true };
const META_NO_BUILD: ActionMetaLike = { noBuild: true };
const META_TRANSIENT: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};

export function installStateApiMetaNamespace(ctx: StateApiHistoryMetaReactivityContext): void {
  const { metaActionsNs, mergeMeta, isObj, normMeta, commitMetaTouch, asMeta, commitMetaPatch } = ctx;

  const emptyMeta = (patch?: Partial<ActionMetaLike>): ActionMetaLike => Object.assign({}, patch || {});
  const metaNs = metaActionsNs;
  const metaAny = metaNs;

  if (typeof metaNs.uiOnly !== 'function') {
    metaNs.uiOnly = function uiOnly(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_UI_ONLY, source || 'meta:uiOnly');
    };
  }

  if (typeof metaNs.restore !== 'function') {
    metaNs.restore = function restore(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_RESTORE, source || 'meta:restore');
    };
  }

  if (typeof metaNs.interactive !== 'function') {
    metaNs.interactive = function interactive(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_INTERACTIVE, source || 'meta:interactive');
    };
  }

  if (typeof metaNs.merge !== 'function') {
    metaNs.merge = function merge(meta?: ActionMetaLike, defaults?: ActionMetaLike, source?: string) {
      const d = isObj(defaults) ? defaults : emptyMeta();
      return mergeMeta(meta, d, source || 'meta:merge');
    };
  }

  if (typeof metaNs.noHistory !== 'function') {
    metaNs.noHistory = function noHistory(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_NO_HISTORY, source || 'meta:noHistory');
    };
  }

  if (typeof metaNs.noBuild !== 'function') {
    metaNs.noBuild = function noBuild(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_NO_BUILD, source || 'meta:noBuild');
    };
  }

  if (typeof metaNs.transient !== 'function') {
    metaNs.transient = function transient(meta?: ActionMetaLike, source?: string) {
      return mergeMeta(meta, META_TRANSIENT, source || 'meta:transient');
    };
  }

  if (typeof metaNs.touch !== 'function' || isActionStubFn(metaNs.touch, 'meta:touch')) {
    metaNs.touch = function touch(meta?: ActionMetaLike) {
      try {
        const m = normMeta(meta, 'meta:touch');
        return commitMetaTouch(m);
      } catch (_e) {}
      return undefined;
    };
  }

  if (typeof metaNs.persist !== 'function' || isActionStubFn(metaNs.persist, 'meta:persist')) {
    metaNs.persist = function persist(meta?: ActionMetaLike) {
      try {
        const m = normMeta(meta, 'meta:persist');
        // Delete-pass: persistence nudges should stay on canonical actions/store paths.
        return metaNs.touch?.(m);
      } catch (_) {}
      return undefined;
    };
  }

  if (typeof metaAny.uiOnlyImmediate !== 'function') {
    metaAny.uiOnlyImmediate = function uiOnlyImmediate(source?: string) {
      const s = source || 'meta:uiOnlyImmediate';
      return typeof metaNs.uiOnly === 'function'
        ? metaNs.uiOnly({ immediate: true }, s)
        : mergeMeta({ immediate: true }, META_UI_ONLY, s);
    };
  }

  if (typeof metaAny.interactiveImmediate !== 'function') {
    metaAny.interactiveImmediate = function interactiveImmediate(source?: string) {
      const s = source || 'meta:interactiveImmediate';
      return typeof metaNs.interactive === 'function'
        ? metaNs.interactive({ immediate: true }, s)
        : mergeMeta({ immediate: true }, META_INTERACTIVE, s);
    };
  }

  if (typeof metaAny.noBuildImmediate !== 'function') {
    metaAny.noBuildImmediate = function noBuildImmediate(source?: string) {
      const s = source || 'meta:noBuildImmediate';
      return typeof metaNs.noBuild === 'function'
        ? metaNs.noBuild({ immediate: true }, s)
        : mergeMeta({ immediate: true }, META_NO_BUILD, s);
    };
  }

  if (typeof metaAny.noHistoryImmediate !== 'function') {
    metaAny.noHistoryImmediate = function noHistoryImmediate(source?: string) {
      const s = source || 'meta:noHistoryImmediate';
      return typeof metaNs.noHistory === 'function'
        ? metaNs.noHistory({ immediate: true }, s)
        : mergeMeta({ immediate: true }, META_NO_HISTORY, s);
    };
  }

  if (typeof metaAny.noHistoryForceBuildImmediate !== 'function') {
    metaAny.noHistoryForceBuildImmediate = function noHistoryForceBuildImmediate(source?: string) {
      const s = source || 'meta:noHistoryForceBuildImmediate';
      const d = typeof metaNs.noHistory === 'function' ? metaNs.noHistory(undefined, s) : META_NO_HISTORY;
      return typeof metaNs.merge === 'function'
        ? metaNs.merge({ immediate: true, forceBuild: true }, d, s)
        : mergeMeta({ immediate: true, forceBuild: true }, d, s);
    };
  }

  if (typeof metaAny.src !== 'function') {
    metaAny.src = function src(source: string) {
      return mergeMeta(undefined, emptyMeta(), String(source || 'meta:src'));
    };
  }

  if (typeof metaAny.srcImmediate !== 'function') {
    metaAny.srcImmediate = function srcImmediate(source: string) {
      return mergeMeta({ immediate: true }, emptyMeta(), String(source || 'meta:srcImmediate'));
    };
  }

  if (typeof metaNs.setDirty !== 'function' || isActionStubFn(metaNs.setDirty, 'meta:setDirty')) {
    let dirtyFallback = false;
    metaNs.setDirty = function setDirty(isDirty: boolean, meta?: ActionMetaLike) {
      dirtyFallback = !!isDirty;

      const metaIn = asMeta(meta);
      const src = typeof metaIn.source === 'string' && metaIn.source ? metaIn.source : 'dirty';
      const metaWithSource = normMeta(metaIn, src);
      const setDirtyMeta =
        typeof metaNs.uiOnly === 'function'
          ? metaNs.uiOnly(metaWithSource, 'meta:setDirty')
          : normMeta(metaWithSource, 'meta:setDirty');

      commitMetaPatch({ dirty: !!isDirty }, setDirtyMeta);
      return dirtyFallback;
    };
  }
}
