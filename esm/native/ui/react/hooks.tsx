import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import type {
  AppContainer,
  ActionsNamespaceLike,
  RootStateLike,
  UiState,
  ConfigStateLike,
  RuntimeStateLike,
  ModeStateLike,
  UnknownRecord,
} from '../../../../types';

import {
  requireMetaActions,
  getUiFeedback,
  getActions,
  requireStoreSelectorSurface,
} from '../../services/api.js';
import { createExportActions } from './export_actions.js';

type SelectorStoreApi = {
  getState: () => RootStateLike;
  subscribeSelector: <T>(
    selector: (state: RootStateLike) => T,
    listener: (selected: T, previous: T, actionMeta?: unknown) => void,
    opts?: { equalityFn?: (a: T, b: T) => boolean; fireImmediately?: boolean }
  ) => (() => void) | void;
};

const AppCtx = createContext<AppContainer | null>(null);

type EqualityFn<T> = (a: T, b: T) => boolean;

function objectIs<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  const ao = a && typeof a === 'object';
  const bo = b && typeof b === 'object';
  if (!ao || !bo) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  const aRec = readRecord(a);
  const bRec = readRecord(b);
  if (!aRec || !bRec) return false;
  const aKeys = Object.keys(aRec);
  const bKeys = Object.keys(bRec);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(bRec, k)) return false;
    if (!Object.is(aRec[k], bRec[k])) return false;
  }
  return true;
}

export function AppProvider(props: { app: AppContainer; children: ReactNode }) {
  const value = useMemo(() => props.app, [props.app]);
  return <AppCtx.Provider value={value}>{props.children}</AppCtx.Provider>;
}

export function useApp(): AppContainer {
  const app = useContext(AppCtx);
  if (!app) throw new Error('[WardrobePro][ReactUI] Missing AppProvider');
  return app;
}

export function useActions(): ActionsNamespaceLike {
  const app = useApp();
  return useMemo(() => {
    const actions = getActions(app);
    if (!actions) {
      throw new Error('[WardrobePro][ReactUI] Missing actions surface (kernel/state_api not installed?)');
    }
    return actions;
  }, [app]);
}

export function useMeta(): NonNullable<ActionsNamespaceLike['meta']> {
  const app = useApp();
  return useMemo(() => requireMetaActions(app, 'react:useMeta'), [app]);
}

export function useUiFeedback() {
  const app = useApp();
  // getUiFeedback() guarantees stable defaults and never throws.
  return useMemo(() => getUiFeedback(app), [app]);
}

type ExportActions = ReturnType<typeof createExportActions>;

export function useExportActions(): ExportActions {
  const app = useApp();
  // Lazily creates the export actions object once per App instance.
  return useMemo(() => {
    const fb = getUiFeedback(app);
    return createExportActions(app, fb.toast);
  }, [app]);
}

function getZustandApiFromApp(app: AppContainer): SelectorStoreApi {
  // Stage 2: React reads should subscribe to the canonical store surface.
  // IMPORTANT: do NOT import Zustand's React bindings here.
  const store = requireStoreSelectorSurface(app, 'ui/react/hooks');
  const subscribeSelector = store.subscribeSelector;

  return {
    getState: () => store.getState(),
    subscribeSelector<T>(
      selector: (state: RootStateLike) => T,
      listener: (selected: T, previous: T, actionMeta?: unknown) => void,
      opts?: { equalityFn?: (a: T, b: T) => boolean; fireImmediately?: boolean }
    ) {
      return subscribeSelector(selector, listener, opts);
    },
  };
}

/**
 * Root-store selector hook with optional equality fn.
 *
 * Stage 2 (Zustand unboxing): subscribe to the canonical store surface via React's
 * `useSyncExternalStore`.
 */
export function useStoreSelector<T>(selector: (state: RootStateLike) => T, equalityFn?: EqualityFn<T>): T {
  const app = useApp();
  // Memoize the store surface so useSyncExternalStore doesn't resubscribe on every render.
  const api = useMemo(() => getZustandApiFromApp(app), [app]);

  // Keep the latest selector/equality without re-subscribing.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const eqRef = useRef<EqualityFn<T>>(equalityFn ?? objectIs);
  eqRef.current = equalityFn ?? objectIs;

  // Snapshot caching:
  // React compares snapshots with Object.is(). If we return the previous selected value when
  // equalityFn says "no semantic change", React will skip the re-render.
  const hasValueRef = useRef(false);
  const valueRef = useRef<{ value: T } | null>(null);
  const stateRef = useRef<RootStateLike | null>(null);

  const getSnapshot = useCallback((): T => {
    const st = api.getState();

    // React calls getSnapshot multiple times per render in development to detect tearing.
    // If selectors allocate new objects/arrays, returning a fresh reference each time can
    // cause an infinite update loop ("getSnapshot should be cached").
    // Cache by the *root state object identity* (Zustand keeps it stable until a commit).
    if (hasValueRef.current && stateRef.current === st && valueRef.current) return valueRef.current.value;

    const next = selectorRef.current(st);
    if (!hasValueRef.current) {
      hasValueRef.current = true;
      valueRef.current = { value: next };
      stateRef.current = st;
      return next;
    }
    if (valueRef.current && eqRef.current(valueRef.current.value, next)) return valueRef.current.value;
    valueRef.current = { value: next };
    stateRef.current = st;
    return next;
  }, [api]);

  const subscribe = useCallback(
    (cb: () => void) => {
      const unsub = api.subscribeSelector(
        (st: RootStateLike) => selectorRef.current(st),
        () => {
          cb();
        },
        {
          equalityFn: (a: T, b: T) => eqRef.current(a, b),
        }
      );
      return typeof unsub === 'function' ? unsub : () => undefined;
    },
    [api]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useStoreSelectorShallow<T extends object | unknown[]>(
  selector: (state: RootStateLike) => T
): T {
  return useStoreSelector(selector, (a, b) => shallowEqual(a, b));
}

export function useUiSelector<T>(selector: (ui: UiState) => T, equalityFn?: EqualityFn<T>): T {
  return useStoreSelector(st => selector(st.ui), equalityFn);
}

export function useUiSelectorShallow<T extends object | unknown[]>(selector: (ui: UiState) => T): T {
  return useUiSelector(selector, (a, b) => shallowEqual(a, b));
}

export function useCfgSelector<T>(selector: (cfg: ConfigStateLike) => T, equalityFn?: EqualityFn<T>): T {
  return useStoreSelector(st => selector(st.config), equalityFn);
}

export function useCfgSelectorShallow<T extends object | unknown[]>(
  selector: (cfg: ConfigStateLike) => T
): T {
  return useCfgSelector(selector, (a, b) => shallowEqual(a, b));
}

export function useRuntimeSelector<T>(selector: (rt: RuntimeStateLike) => T, equalityFn?: EqualityFn<T>): T {
  return useStoreSelector(st => selector(st.runtime), equalityFn);
}

export function useRuntimeSelectorShallow<T extends object | unknown[]>(
  selector: (rt: RuntimeStateLike) => T
): T {
  return useRuntimeSelector(selector, (a, b) => shallowEqual(a, b));
}

export function useModeSelector<T>(selector: (mode: ModeStateLike) => T, equalityFn?: EqualityFn<T>): T {
  return useStoreSelector(st => selector(st.mode), equalityFn);
}

export function useModeSelectorShallow<T extends object | unknown[]>(
  selector: (mode: ModeStateLike) => T
): T {
  return useModeSelector(selector, (a, b) => shallowEqual(a, b));
}
