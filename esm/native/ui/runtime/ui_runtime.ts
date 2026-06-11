// UI runtime state (Pure ESM)
//
// Purpose:
// - Hold transient UI installation state (disposers / guards) outside legacy wiring.
// - Keep installers idempotent and safe under repeated boot/HMR.
//
// NOTE: This file must not import DOM-specific helpers.

import type { UnknownRecord } from '../../../../types';

export type Disposer = (() => void) | null;

type DisposerMap = Record<string, Disposer>;

type UiRuntimeState = UnknownRecord & {
  disposers?: unknown;
  api?: unknown;
};

type UiRuntimeHost = UnknownRecord & {
  uiRuntime?: unknown;
};

export interface UiRuntime {
  disposers: DisposerMap;

  /**
   * Register a disposer under a key.
   * If a disposer already exists under that key, it will be called before replacing.
   */
  setDisposer: (key: string, fn: Disposer) => void;

  /** Get disposer by key (or null). */
  getDisposer: (key: string) => Disposer;

  /** Clear (call + remove) disposer by key. */
  clearDisposer: (key: string) => void;

  /**
   * Convenience helper: compute a disposer and register it in one step.
   * If the installer throws, no disposer will be registered.
   */
  install: (key: string, installer: () => Disposer) => Disposer;

  /** Clear all registered disposers. */
  clearAll: () => void;
}

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asHost(v: unknown): UiRuntimeHost {
  return isRecord(v) ? v : {};
}

function isDisposer(value: unknown): value is Disposer {
  return value === null || typeof value === 'function';
}

function isDisposerMap(value: unknown): value is DisposerMap {
  return isRecord(value) && Object.values(value).every(isDisposer);
}

function isUiRuntime(value: unknown): value is UiRuntime {
  return (
    isRecord(value) &&
    isDisposerMap(value.disposers) &&
    typeof value.setDisposer === 'function' &&
    typeof value.getDisposer === 'function' &&
    typeof value.clearDisposer === 'function' &&
    typeof value.install === 'function' &&
    typeof value.clearAll === 'function'
  );
}

function ensureRuntimeState(host: UiRuntimeHost): UiRuntimeState {
  const current = isRecord(host.uiRuntime) ? host.uiRuntime : null;
  if (current) return current;
  const next: UiRuntimeState = {};
  host.uiRuntime = next;
  return next;
}

function ensureDisposers(state: UiRuntimeState): DisposerMap {
  const current = isDisposerMap(state.disposers) ? state.disposers : null;
  if (current) return current;
  const next: DisposerMap = {};
  state.disposers = next;
  return next;
}

function getCachedApi(state: UiRuntimeState): UiRuntime | null {
  return isUiRuntime(state.api) ? state.api : null;
}

function safeCall(fn: unknown): void {
  try {
    if (typeof fn === 'function') Reflect.apply(fn, undefined, []);
  } catch {
    // swallow
  }
}

function safeKey(key: unknown): string {
  try {
    return String(key ?? '').trim();
  } catch {
    return '';
  }
}

function safeUiKey(key: unknown): string {
  const k = safeKey(key);
  // Professional contract: UiRuntime keys are namespaced (prevents collisions/leaks).
  return k.startsWith('ui:') ? k : '';
}

export function getUiRuntime(App: unknown): UiRuntime {
  const host = asHost(App);
  const rt = ensureRuntimeState(host);
  const disposers = ensureDisposers(rt);

  // Reuse cached runtime API if present.
  const cached = getCachedApi(rt);
  if (cached) return cached;

  const api: UiRuntime = {
    disposers,

    setDisposer(key: string, fn: Disposer) {
      const k = safeUiKey(key);
      if (!k) {
        // Do not store under empty keys.
        safeCall(fn);
        return;
      }
      const prev = disposers[k] || null;
      if (prev && prev !== fn) safeCall(prev);
      disposers[k] = fn;
    },

    getDisposer(key: string) {
      const k = safeUiKey(key);
      return k ? disposers[k] || null : null;
    },

    clearDisposer(key: string) {
      const k = safeUiKey(key);
      if (!k) return;
      const prev = disposers[k] || null;
      if (prev) safeCall(prev);
      delete disposers[k];
    },

    install(key: string, installer: () => Disposer) {
      const k = safeUiKey(key);
      if (!k || typeof installer !== 'function') return null;
      let fn: Disposer = null;
      try {
        fn = installer();
      } catch {
        fn = null;
      }

      // Professional contract: an installed key always yields a callable disposer.
      // If the installer returns null/invalid, normalize to a no-op disposer.
      if (typeof fn !== 'function') fn = () => undefined;

      api.setDisposer(k, fn);
      return fn;
    },

    clearAll() {
      const keys = Object.keys(disposers);
      for (const k of keys) {
        try {
          api.clearDisposer(k);
        } catch {
          // swallow
        }
      }
    },
  };

  rt.api = api;
  return api;
}
