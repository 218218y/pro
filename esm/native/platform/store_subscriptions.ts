import type { ActionMetaLike, RootStateLike } from '../../../types';

export type StoreListener = (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
export type StoreSelector<T> = (state: RootStateLike) => T;
export type StoreSelectorListener<T> = (selected: T, previous: T, actionMeta?: ActionMetaLike) => void;
export type StoreSelectorEqualityFn<T> = (a: T, b: T) => boolean;
export type StoreSelectorOpts<T> = {
  equalityFn?: StoreSelectorEqualityFn<T>;
  fireImmediately?: boolean;
};
export type SelectorRegistryEntry = {
  prime: (state: RootStateLike) => boolean;
  fireCurrent: (actionMeta?: ActionMetaLike) => void;
  notify: (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
};

export function createSelectorRegistryEntry<T>(args: {
  selector: StoreSelector<T>;
  listener: StoreSelectorListener<T>;
  equalityFn: StoreSelectorEqualityFn<T>;
  onNotify: () => void;
}): SelectorRegistryEntry {
  let cached: { value: T } | null = null;

  return {
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
        // ignore
      }
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
          // ignore
        }
        return;
      }

      try {
        if (args.equalityFn(cached.value, nextValue)) return;
      } catch {
        // ignore
      }

      const previousValue = cached.value;
      cached.value = nextValue;
      args.onNotify();
      try {
        args.listener(nextValue, previousValue, actionMeta);
      } catch {
        // ignore
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
