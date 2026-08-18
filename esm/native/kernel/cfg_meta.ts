// Native ESM conversion (TypeScript)
// Stage 117 - kernel native

import type {
  ActionMetaLike,
  AppContainer,
  CanonicalActionMetaLike,
  MetaActionsNamespaceLike,
  UnknownRecord,
} from '../../../types';
import { mergeCanonicalActionMeta } from '../runtime/action_meta_contract.js';
import { ensureActionsRoot, ensureActionNamespace } from '../runtime/actions_access_core.js';

type MetaInput = ActionMetaLike | UnknownRecord | undefined;
type ConfigMetaNamespaceLike = MetaActionsNamespaceLike & {
  CFG_META_DEFAULTS?: ActionMetaLike;
};

type MetaMergeFn = (meta?: MetaInput, defaults?: ActionMetaLike, defaultSource?: string) => ActionMetaLike;

const CFG_META_DEFAULTS = { silent: false } satisfies CanonicalActionMetaLike;
const CFG_META_EMPTY = {} satisfies CanonicalActionMetaLike;
const CFG_META_UI_ONLY = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
  uiOnly: true,
} satisfies CanonicalActionMetaLike;
const CFG_META_RESTORE = {
  silent: true,
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
} satisfies CanonicalActionMetaLike;
const CFG_META_NO_HISTORY = { noHistory: true, noCapture: true } satisfies CanonicalActionMetaLike;
const CFG_META_NO_BUILD = { noBuild: true } satisfies CanonicalActionMetaLike;
const CFG_META_TRANSIENT = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
} satisfies CanonicalActionMetaLike;

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
      defaultSource?: string
    ): ActionMetaLike {
      const profileDefaults = mergeCanonicalActionMeta(defaults, metaNs.CFG_META_DEFAULTS);
      return mergeCanonicalActionMeta(meta, profileDefaults, defaultSource);
    };

  const cfgMetaMerge: MetaMergeFn =
    typeof metaNs.merge === 'function'
      ? metaNs.merge
      : (meta?: MetaInput, defaults?: ActionMetaLike, defaultSource?: string) => {
          const profileDefaults = mergeCanonicalActionMeta(defaults, metaNs.CFG_META_DEFAULTS);
          return mergeCanonicalActionMeta(meta, profileDefaults, defaultSource);
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
