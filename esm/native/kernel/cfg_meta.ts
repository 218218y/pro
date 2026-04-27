// Native ESM conversion (TypeScript)
// Converted from legacy: js/kernel/pro_cfg_meta.js
// Stage 117 - kernel native

import type { AppContainer, ActionMetaLike, MetaActionsNamespaceLike, UnknownRecord } from '../../../types';
import { asRecord as asUnknownRecord } from '../runtime/record.js';
import { ensureActionsRoot, ensureActionNamespace } from '../runtime/actions_access_core.js';

type MetaInput = ActionMetaLike | UnknownRecord | undefined;
type ConfigMetaNamespaceLike = MetaActionsNamespaceLike & {
  CFG_META_DEFAULTS?: ActionMetaLike;
};

type MetaMergeFn = (meta?: MetaInput, defaults?: ActionMetaLike, sourceFallback?: string) => ActionMetaLike;

function asRecord(value: unknown): UnknownRecord {
  return asUnknownRecord(value) || {};
}

const CFG_META_DEFAULTS: ActionMetaLike = { silent: false };
const CFG_META_EMPTY: ActionMetaLike = {};
const CFG_META_UI_ONLY: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
  uiOnly: true,
};
const CFG_META_RESTORE: ActionMetaLike = {
  silent: true,
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};
const CFG_META_NO_HISTORY: ActionMetaLike = { noHistory: true, noCapture: true };
const CFG_META_NO_BUILD: ActionMetaLike = { noBuild: true };
const CFG_META_TRANSIENT: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};

/**
 * Install kernel cfg-meta helpers.
 *
 * Canonical home for meta profiles:
 * - App.actions.meta.*
 *
 * Notes:
 * - Profiles only apply defaults when fields are not specified by the caller.
 * - Always returns a NEW object (never mutates input).
 */
export function installCfgMeta(App: AppContainer): void {
  if (!App || typeof App !== 'object') return;

  ensureActionsRoot(App);
  const metaNs: UnknownRecord & Partial<ConfigMetaNamespaceLike> = ensureActionNamespace(App, 'meta');

  metaNs.CFG_META_DEFAULTS = metaNs.CFG_META_DEFAULTS || { ...CFG_META_DEFAULTS };

  metaNs.merge =
    metaNs.merge ||
    function cfgMetaMerge(
      meta?: MetaInput,
      defaults?: ActionMetaLike,
      sourceFallback?: string
    ): ActionMetaLike {
      const metaRecord = asRecord(meta);
      const defaultsRecord = asRecord(defaults);
      const out: ActionMetaLike = Object.assign({}, asRecord(metaNs.CFG_META_DEFAULTS), defaultsRecord);
      for (const key of Object.keys(metaRecord)) out[key] = metaRecord[key];
      if (sourceFallback && !out.source) out.source = sourceFallback;
      return out;
    };

  const cfgMetaMerge: MetaMergeFn =
    typeof metaNs.merge === 'function'
      ? metaNs.merge
      : (meta?: MetaInput, defaults?: ActionMetaLike, sourceFallback?: string) => {
          const metaRecord = asRecord(meta);
          const defaultsRecord = asRecord(defaults);
          const out: ActionMetaLike = Object.assign({}, asRecord(metaNs.CFG_META_DEFAULTS), defaultsRecord);
          for (const key of Object.keys(metaRecord)) out[key] = metaRecord[key];
          if (sourceFallback && !out.source) out.source = sourceFallback;
          return out;
        };

  metaNs.interactive =
    metaNs.interactive ||
    function cfgMetaInteractive(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_EMPTY, source || 'meta:interactive');
    };

  metaNs.uiOnly =
    metaNs.uiOnly ||
    function cfgMetaUiOnly(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_UI_ONLY, source || 'meta:uiOnly');
    };

  metaNs.restore =
    metaNs.restore ||
    function cfgMetaRestore(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_RESTORE, source || 'meta:restore');
    };

  metaNs.noHistory =
    metaNs.noHistory ||
    function cfgMetaNoHistory(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_NO_HISTORY, source || 'meta:noHistory');
    };

  metaNs.noBuild =
    metaNs.noBuild ||
    function cfgMetaNoBuild(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_NO_BUILD, source || 'meta:noBuild');
    };

  metaNs.transient =
    metaNs.transient ||
    function cfgMetaTransient(meta?: MetaInput, source?: string): ActionMetaLike {
      return cfgMetaMerge(meta, CFG_META_TRANSIENT, source || 'meta:transient');
    };
}
