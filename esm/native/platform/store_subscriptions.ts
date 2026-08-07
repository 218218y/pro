import type { ActionMetaLike, RootStateLike, RootSliceKey, StoreSelectorSliceKey } from '../../../types';

export type StoreListener = (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
export type StoreSelector<T> = (state: RootStateLike) => T;
export type StoreSelectorListener<T> = (selected: T, previous: T, actionMeta?: ActionMetaLike) => void;
export type StoreSelectorEqualityFn<T> = (a: T, b: T) => boolean;
export type StoreSelectorOpts<T> = {
  equalityFn?: StoreSelectorEqualityFn<T>;
  fireImmediately?: boolean;
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
};
export type SelectorRegistryEntry = {
  slices: readonly StoreSelectorSliceKey[];
  prime: (state: RootStateLike) => boolean;
  fireCurrent: (actionMeta?: ActionMetaLike) => void;
  shouldNotify: (actionMeta?: ActionMetaLike) => boolean;
  notify: (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
};

const ALL_SELECTOR_SLICE: StoreSelectorSliceKey = 'all';
const AFFECTS_FLAG_BY_SLICE: Record<RootSliceKey, string> = {
  ui: 'affectsUi',
  config: 'affectsConfig',
  runtime: 'affectsRuntime',
  mode: 'affectsMode',
  meta: 'affectsMeta',
};

function isSelectorSliceKey(value: unknown): value is StoreSelectorSliceKey {
  return (
    value === 'ui' ||
    value === 'config' ||
    value === 'runtime' ||
    value === 'mode' ||
    value === 'meta' ||
    value === 'root' ||
    value === 'all'
  );
}

function normalizeSelectorSlices(opts: {
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
}): readonly StoreSelectorSliceKey[] {
  const rawSlices: unknown[] = [];
  if (typeof opts.slice !== 'undefined') rawSlices.push(opts.slice);
  if (Array.isArray(opts.slices)) rawSlices.push(...opts.slices);
  if (!rawSlices.length) return [ALL_SELECTOR_SLICE];

  const out: StoreSelectorSliceKey[] = [];
  for (const raw of rawSlices) {
    if (!isSelectorSliceKey(raw)) {
      throw new Error(`[WardrobePro][store] Invalid selector slice: ${String(raw)}`);
    }
    if (raw === 'root' || raw === 'all') return [ALL_SELECTOR_SLICE];
    if (!out.includes(raw)) out.push(raw);
  }

  return out.length ? out : [ALL_SELECTOR_SLICE];
}

function readActionMetaRecord(actionMeta: ActionMetaLike | undefined): Record<string, unknown> | null {
  return actionMeta && typeof actionMeta === 'object' && !Array.isArray(actionMeta)
    ? (actionMeta as Record<string, unknown>)
    : null;
}

function hasAffectsSignals(meta: Record<string, unknown>): boolean {
  return (
    typeof meta.affectsUi === 'boolean' ||
    typeof meta.affectsConfig === 'boolean' ||
    typeof meta.affectsRuntime === 'boolean' ||
    typeof meta.affectsMode === 'boolean' ||
    typeof meta.affectsMeta === 'boolean'
  );
}

function shouldNotifySelectorSlice(
  slice: StoreSelectorSliceKey,
  actionMeta: ActionMetaLike | undefined
): boolean {
  if (slice === 'root' || slice === 'all') return true;

  const meta = readActionMetaRecord(actionMeta);
  if (!meta) return true;

  const actionType = typeof meta.type === 'string' ? meta.type : '';
  if (actionType === 'SET') return true;
  if (!hasAffectsSignals(meta)) return true;

  if (slice === 'meta') return true;
  return meta[AFFECTS_FLAG_BY_SLICE[slice]] === true;
}

export function createSelectorRegistryEntry<T>(args: {
  selector: StoreSelector<T>;
  listener: StoreSelectorListener<T>;
  equalityFn: StoreSelectorEqualityFn<T>;
  onNotify: () => void;
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
}): SelectorRegistryEntry {
  let cached: { value: T } | null = null;
  const slices = normalizeSelectorSlices({ slice: args.slice, slices: args.slices });

  return {
    slices,
    prime(state) {
      try {
        cached = { value: args.selector(state) };
        return true;
      } catch {
        cached = null;
        return false;
      }
    },
    fireCurrent(actionMeta) {
      if (!cached) return;
      try {
        args.listener(cached.value, cached.value, actionMeta);
      } catch {
        // observer-isolation: a listener failure must not corrupt subscription state.
      }
    },
    shouldNotify(actionMeta) {
      for (const slice of slices) {
        if (shouldNotifySelectorSlice(slice, actionMeta)) return true;
      }
      return false;
    },
    notify(state, actionMeta) {
      let nextValue: T;
      try {
        nextValue = args.selector(state);
      } catch {
        return;
      }

      if (!cached) {
        cached = { value: nextValue };
        args.onNotify();
        try {
          args.listener(nextValue, nextValue, actionMeta);
        } catch {
          // observer-isolation: initial listener delivery must not corrupt cached selector state.
        }
        return;
      }

      try {
        if (args.equalityFn(cached.value, nextValue)) return;
      } catch {
        // selector-equality-fallback: if equality probing fails, notify conservatively as changed.
      }

      const previousValue = cached.value;
      cached.value = nextValue;
      args.onNotify();
      try {
        args.listener(nextValue, previousValue, actionMeta);
      } catch {
        // observer-isolation: one listener failure must not block later store updates.
      }
    },
  };
}

export function createListenerRegistry<T>() {
  const list: T[] = [];
  const hasSet = typeof Set === 'function';
  const set: Set<T> | null = hasSet ? new Set<T>() : null;

  function add(item: T): () => void {
    if (hasSet && set) {
      set.add(item);
      return function unsubscribeSet() {
        set.delete(item);
      };
    }
    list.push(item);
    return function unsubscribeArray() {
      const idx = list.indexOf(item);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  function forEach(fn: (listener: T) => void): void {
    if (hasSet && set) {
      set.forEach(function each(listener) {
        fn(listener);
      });
      return;
    }
    for (let i = 0; i < list.length; i += 1) fn(list[i]);
  }

  return { add, forEach };
}
