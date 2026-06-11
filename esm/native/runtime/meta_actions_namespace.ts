import type {
  ActionMetaLike,
  MetaActionsNamespaceLike,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';

import {
  META_PROFILE_DEFAULTS_INTERACTIVE as META_STUB_INTERACTIVE,
  META_PROFILE_DEFAULTS_NO_BUILD as META_STUB_NO_BUILD,
  META_PROFILE_DEFAULTS_NO_HISTORY as META_STUB_NO_HISTORY,
  META_PROFILE_DEFAULTS_RESTORE as META_STUB_RESTORE,
  META_PROFILE_DEFAULTS_TRANSIENT as META_STUB_TRANSIENT,
  META_PROFILE_DEFAULTS_UI_ONLY as META_STUB_UI_ONLY,
  buildMetaInteractiveImmediate,
  buildMetaNoBuildImmediate,
  buildMetaNoHistoryForceBuildImmediate,
  buildMetaNoHistoryImmediate,
  buildMetaSource,
  buildMetaSourceImmediate,
  buildMetaUiOnlyImmediate,
  mergeMetaProfileDefaults,
} from './meta_profiles_contract.js';

export type ActionCallable = UnknownCallable;
export type ActionAccessFn = ActionCallable | ((...args: never[]) => unknown);
export type ActionNode = UnknownRecord;

const ACTION_STUB_META_KEY = '__wp_actionStubMeta';
const ACTION_STUB_FLAG_KEY = '__wp_isStub';

type ActionStubMeta = {
  kind: string;
};

function mergeMetaProfile(
  meta?: ActionMetaLike,
  defaults?: ActionMetaLike,
  sourceFallback?: string
): ActionMetaLike {
  return mergeMetaProfileDefaults(meta, defaults, sourceFallback);
}

export function readActionStubMeta(value: unknown): ActionStubMeta | null {
  if (typeof value !== 'function') return null;
  const meta = Reflect.get(value, ACTION_STUB_META_KEY);
  if (!meta || typeof meta !== 'object') return null;
  const kind = Reflect.get(meta, 'kind');
  return typeof kind === 'string' && kind ? { kind } : null;
}

export function isActionStubFn(value: unknown, expectedKind?: string): boolean {
  if (typeof value !== 'function') return false;
  if (Reflect.get(value, ACTION_STUB_FLAG_KEY) !== true) return false;
  if (!expectedKind) return true;
  return readActionStubMeta(value)?.kind === expectedKind;
}

export function markActionStub<T extends ActionAccessFn>(fn: T, kind: string): T {
  Reflect.set(fn, ACTION_STUB_FLAG_KEY, true);
  Reflect.set(fn, ACTION_STUB_META_KEY, { kind });
  return fn;
}

export function copyActionStubMeta<T extends ActionAccessFn>(target: T, source: unknown): T {
  if (typeof source !== 'function' || !isActionStubFn(source)) return target;
  const meta = readActionStubMeta(source);
  return markActionStub(target, meta?.kind || 'stub');
}

const META_ACTIONS_STUB = {
  uiOnly(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_UI_ONLY, source);
  },
  restore(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_RESTORE, source);
  },
  interactive(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_INTERACTIVE, source);
  },
  transient(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_TRANSIENT, source);
  },
  merge(meta?: ActionMetaLike, defaults?: ActionMetaLike, sourceFallback?: string): ActionMetaLike {
    return mergeMetaProfile(meta, defaults, sourceFallback);
  },
  noBuild(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_NO_BUILD, source);
  },
  noHistory(meta?: ActionMetaLike, source?: string): ActionMetaLike {
    return mergeMetaProfile(meta, META_STUB_NO_HISTORY, source);
  },
  uiOnlyImmediate(source?: string): ActionMetaLike {
    return buildMetaUiOnlyImmediate(source);
  },
  interactiveImmediate(source?: string): ActionMetaLike {
    return buildMetaInteractiveImmediate(source);
  },
  noBuildImmediate(source?: string): ActionMetaLike {
    return buildMetaNoBuildImmediate(source);
  },
  noHistoryImmediate(source?: string): ActionMetaLike {
    return buildMetaNoHistoryImmediate(source);
  },
  noHistoryForceBuildImmediate(source?: string): ActionMetaLike {
    return buildMetaNoHistoryForceBuildImmediate(source);
  },
  src(source: string): ActionMetaLike {
    return buildMetaSource(source);
  },
  srcImmediate(source: string): ActionMetaLike {
    return buildMetaSourceImmediate(source);
  },
  setDirty: markActionStub(function setDirty(): unknown {
    return undefined;
  }, 'meta:setDirty'),
  touch: markActionStub(function touch(): unknown {
    return undefined;
  }, 'meta:touch'),
  persist: markActionStub(function persist(): unknown {
    return undefined;
  }, 'meta:persist'),
} satisfies MetaActionsNamespaceLike;

const META_ACTION_STUB_KEYS: (keyof typeof META_ACTIONS_STUB)[] = [
  'uiOnly',
  'restore',
  'interactive',
  'transient',
  'merge',
  'noBuild',
  'noHistory',
  'uiOnlyImmediate',
  'interactiveImmediate',
  'noBuildImmediate',
  'noHistoryImmediate',
  'noHistoryForceBuildImmediate',
  'src',
  'srcImmediate',
  'setDirty',
  'touch',
  'persist',
];

function ensureMetaActionStub<K extends keyof typeof META_ACTIONS_STUB>(
  target: Partial<MetaActionsNamespaceLike>,
  key: K
): void {
  if (typeof target[key] !== 'function') target[key] = META_ACTIONS_STUB[key];
}

export function ensureMetaActionsNamespace(
  node: Partial<MetaActionsNamespaceLike> & ActionNode
): MetaActionsNamespaceLike {
  for (const key of META_ACTION_STUB_KEYS) ensureMetaActionStub(node, key);
  const ensured: MetaActionsNamespaceLike = {
    ...node,
    uiOnly: typeof node.uiOnly === 'function' ? node.uiOnly : META_ACTIONS_STUB.uiOnly,
    restore: typeof node.restore === 'function' ? node.restore : META_ACTIONS_STUB.restore,
    interactive: typeof node.interactive === 'function' ? node.interactive : META_ACTIONS_STUB.interactive,
    transient: typeof node.transient === 'function' ? node.transient : META_ACTIONS_STUB.transient,
    merge: typeof node.merge === 'function' ? node.merge : META_ACTIONS_STUB.merge,
    noBuild: typeof node.noBuild === 'function' ? node.noBuild : META_ACTIONS_STUB.noBuild,
    noHistory: typeof node.noHistory === 'function' ? node.noHistory : META_ACTIONS_STUB.noHistory,
    uiOnlyImmediate:
      typeof node.uiOnlyImmediate === 'function' ? node.uiOnlyImmediate : META_ACTIONS_STUB.uiOnlyImmediate,
    interactiveImmediate:
      typeof node.interactiveImmediate === 'function'
        ? node.interactiveImmediate
        : META_ACTIONS_STUB.interactiveImmediate,
    noBuildImmediate:
      typeof node.noBuildImmediate === 'function'
        ? node.noBuildImmediate
        : META_ACTIONS_STUB.noBuildImmediate,
    noHistoryImmediate:
      typeof node.noHistoryImmediate === 'function'
        ? node.noHistoryImmediate
        : META_ACTIONS_STUB.noHistoryImmediate,
    noHistoryForceBuildImmediate:
      typeof node.noHistoryForceBuildImmediate === 'function'
        ? node.noHistoryForceBuildImmediate
        : META_ACTIONS_STUB.noHistoryForceBuildImmediate,
    src: typeof node.src === 'function' ? node.src : META_ACTIONS_STUB.src,
    srcImmediate:
      typeof node.srcImmediate === 'function' ? node.srcImmediate : META_ACTIONS_STUB.srcImmediate,
    setDirty: typeof node.setDirty === 'function' ? node.setDirty : META_ACTIONS_STUB.setDirty,
    touch: typeof node.touch === 'function' ? node.touch : META_ACTIONS_STUB.touch,
    persist: typeof node.persist === 'function' ? node.persist : META_ACTIONS_STUB.persist,
  };
  return Object.assign(node, ensured);
}
