// Native ESM lifecycle visibility handlers.

import type { PlatformNamespace, UnknownRecord } from '../../../types';
import {
  isLifecycleVisibilityInstalled,
  markLifecycleVisibilityInstalled,
} from '../runtime/install_state_access.js';
import { getDocumentMaybe, getWindowMaybe, cancelAnimationFrameMaybe, reportError } from '../runtime/api.js';
import { snapDrawersToTargetsViaService } from '../runtime/doors_access.js';
import { runPlatformWakeupFollowThrough } from '../runtime/platform_access.js';
import { getLoopRaf, setLoopRaf } from '../runtime/render_access.js';
import { ensureLifecycleRoot, setLifecycleTabHidden } from '../runtime/app_roots_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

type LifecycleHandlersLike = UnknownRecord & {
  snapDrawersToTargets?: () => void;
  onVisibilityChange?: (isHidden: unknown) => void;
  onWindowFocus?: () => void;
  onWindowPageShow?: () => void;
  __wpSnapDrawersToTargets?: () => void;
  __wpOnVisibilityChange?: (isHidden: unknown) => void;
  __wpOnWindowFocus?: () => void;
  __wpOnWindowPageShow?: () => void;
};

type LifecycleRootLike = UnknownRecord & {
  lifecycleHandlers?: LifecycleHandlersLike;
  lifecycle?: UnknownRecord;
  platform?: PlatformNamespace;
};

type LifecycleDomListener = EventListener;

type LifecycleBindingsState = {
  cleanup: (() => void) | null;
  onVisibilityEvent: LifecycleDomListener | null;
  onFocusEvent: LifecycleDomListener | null;
  onPageShowEvent: LifecycleDomListener | null;
};

const lifecycleBindingsByRoot = new WeakMap<object, LifecycleBindingsState>();

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readLifecycleRoot(value: unknown): LifecycleRootLike | null {
  return readRecord(value);
}

function readLifecycleHandlers(value: unknown): LifecycleHandlersLike | null {
  return readRecord(value);
}

function readDocumentHidden(doc: Document | null | undefined): boolean {
  if (!doc) return false;
  const hidden = Reflect.get(doc, 'hidden');
  return typeof hidden === 'boolean' ? hidden : false;
}

function reportLifecycleNonFatal(root: LifecycleRootLike, op: string, error: unknown): void {
  try {
    reportError(root, error, { where: 'native/platform/lifecycle_visibility', op, fatal: false });
  } catch {
    // reporter-isolation: lifecycle recovery must not fail because diagnostics failed.
  }
}

function ensureLifecycleBindingsState(root: object): LifecycleBindingsState {
  const current = lifecycleBindingsByRoot.get(root);
  if (current) return current;
  const next: LifecycleBindingsState = {
    cleanup: null,
    onVisibilityEvent: null,
    onFocusEvent: null,
    onPageShowEvent: null,
  };
  lifecycleBindingsByRoot.set(root, next);
  return next;
}

function bindLifecycleBrowserEvents(root: LifecycleRootLike, life: LifecycleHandlersLike): void {
  const state = ensureLifecycleBindingsState(root);
  if (typeof state.cleanup === 'function') return;

  const removers: Array<() => void> = [];
  const doc = getDocumentMaybe(root);
  const win = getWindowMaybe(root);

  if (!state.onVisibilityEvent) {
    state.onVisibilityEvent = () => {
      try {
        if (typeof life.onVisibilityChange === 'function') life.onVisibilityChange(readDocumentHidden(doc));
      } catch {
        // swallow
      }
    };
  }
  if (!state.onFocusEvent) {
    state.onFocusEvent = () => {
      try {
        if (typeof life.onWindowFocus === 'function') life.onWindowFocus();
      } catch {
        // swallow
      }
    };
  }
  if (!state.onPageShowEvent) {
    state.onPageShowEvent = () => {
      try {
        if (typeof life.onWindowPageShow === 'function') life.onWindowPageShow();
      } catch {
        // swallow
      }
    };
  }

  try {
    if (doc && typeof doc.addEventListener === 'function' && state.onVisibilityEvent) {
      const onVisibilityEvent = state.onVisibilityEvent;
      doc.addEventListener('visibilitychange', onVisibilityEvent, { passive: true });
      removers.push(() => {
        try {
          if (typeof doc.removeEventListener === 'function')
            doc.removeEventListener('visibilitychange', onVisibilityEvent);
        } catch {
          // swallow
        }
      });
    }

    if (win && typeof win.addEventListener === 'function') {
      if (state.onFocusEvent) {
        const onFocusEvent = state.onFocusEvent;
        win.addEventListener('focus', onFocusEvent, { passive: true });
        removers.push(() => {
          try {
            if (typeof win.removeEventListener === 'function') win.removeEventListener('focus', onFocusEvent);
          } catch {
            // swallow
          }
        });
      }
      if (state.onPageShowEvent) {
        const onPageShowEvent = state.onPageShowEvent;
        win.addEventListener('pageshow', onPageShowEvent, { passive: true });
        removers.push(() => {
          try {
            if (typeof win.removeEventListener === 'function')
              win.removeEventListener('pageshow', onPageShowEvent);
          } catch {
            // swallow
          }
        });
      }
    }
  } catch {
    // swallow (platform stays DOM-optional under Node/tests)
  }

  state.cleanup = () => {
    const fns = removers.splice(0, removers.length);
    for (let i = 0; i < fns.length; i++) {
      try {
        fns[i]();
      } catch {
        // swallow
      }
    }
    state.cleanup = null;
  };
}

export function installLifecycleVisibility(App: unknown) {
  const rootCandidate = readLifecycleRoot(App);
  if (!rootCandidate)
    throw new Error('[WardrobePro][ESM] installLifecycleVisibility(App) requires an app object');
  const root = rootCandidate;

  root.lifecycleHandlers = readLifecycleHandlers(root.lifecycleHandlers) || {};
  const life = root.lifecycleHandlers;
  const bindings = ensureLifecycleBindingsState(root);

  function snapDrawersToTargetsSafe() {
    try {
      snapDrawersToTargetsViaService(root);
    } catch (error) {
      reportLifecycleNonFatal(root, 'snapDrawersToTargets', error);
    }
  }

  ensureLifecycleRoot(root);

  installStableSurfaceMethod(life, 'snapDrawersToTargets', '__wpSnapDrawersToTargets', () => {
    return function () {
      snapDrawersToTargetsSafe();
    };
  });

  installStableSurfaceMethod(life, 'onVisibilityChange', '__wpOnVisibilityChange', () => {
    return function (isHidden: unknown) {
      try {
        setLifecycleTabHidden(root, !!isHidden);
      } catch (error) {
        reportLifecycleNonFatal(root, 'visibility.setHidden', error);
      }

      if (isHidden) {
        try {
          const loopRaf = getLoopRaf(root);
          if (loopRaf) {
            try {
              const caf = cancelAnimationFrameMaybe(root);
              if (caf) caf(loopRaf);
              else cancelAnimationFrame(loopRaf);
            } catch (_eCaf) {
              // swallow
            }
            setLoopRaf(root, 0);
          }
        } catch (error) {
          reportLifecycleNonFatal(root, 'visibility.pauseRenderLoop', error);
        }
        return;
      }

      try {
        setLifecycleTabHidden(root, false);
      } catch (error) {
        reportLifecycleNonFatal(root, 'visibility.clearHidden', error);
      }

      runPlatformWakeupFollowThrough(root, {
        afterTouch: () => {
          try {
            life.snapDrawersToTargets?.();
          } catch (error) {
            reportLifecycleNonFatal(root, 'visibility.snapDrawers', error);
          }
        },
      });
    };
  });

  installStableSurfaceMethod(life, 'onWindowFocus', '__wpOnWindowFocus', () => {
    return function () {
      runPlatformWakeupFollowThrough(root, {
        afterTouch: () => {
          try {
            life.snapDrawersToTargets?.();
          } catch (error) {
            reportLifecycleNonFatal(root, 'focus.snapDrawers', error);
          }
        },
      });
    };
  });

  installStableSurfaceMethod(life, 'onWindowPageShow', '__wpOnWindowPageShow', () => {
    return function () {
      runPlatformWakeupFollowThrough(root, {
        afterTouch: () => {
          try {
            life.snapDrawersToTargets?.();
          } catch (error) {
            reportLifecycleNonFatal(root, 'pageshow.snapDrawers', error);
          }
        },
      });
    };
  });

  if (!isLifecycleVisibilityInstalled(root)) {
    bindLifecycleBrowserEvents(root, life);
    markLifecycleVisibilityInstalled(root);
  } else if (typeof bindings.cleanup !== 'function') {
    bindLifecycleBrowserEvents(root, life);
  }

  root.lifecycle = readRecord(root.lifecycle) || {};
  root.lifecycle.cleanup = () => {
    try {
      bindings.cleanup?.();
    } catch {
      // swallow
    }
  };
}
