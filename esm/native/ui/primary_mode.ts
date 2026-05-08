// Primary mode UI renderer (Native ESM)
//
// Converted from `js/ui/pro_ui_primary_mode.js`.
//
// Responsibilities:
// - Keep DOM/UI-only side effects out of kernel/core.
// - Store-driven effects.
import {
  getDocumentMaybe,
  setDataAttr,
  readModeStateFromStore,
  MODES,
  ensureUiModesRuntimeService,
  getStoreSubscriber,
  getStoreSurfaceMaybe,
} from '../services/api.js';
import { toggleBodyClass } from './dom_helpers.js';

import type {
  AppContainer,
  RootStateLike,
  UiPrimaryModeEffectsStoreLike,
  UnknownRecord,
} from '../../../types';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readCleanupUnsubscribe(value: unknown): (() => void) | null {
  if (!value || typeof value !== 'object') return null;
  const unsubscribe = Reflect.get(value, 'unsubscribe');
  return typeof unsubscribe === 'function' ? () => Reflect.apply(unsubscribe, value, []) : null;
}

function isLiveCleanupHandle(value: unknown): boolean {
  return typeof value === 'function' || !!readCleanupUnsubscribe(value);
}

function callCleanupHandle(value: unknown): void {
  try {
    if (typeof value === 'function') {
      value();
      return;
    }
    readCleanupUnsubscribe(value)?.();
  } catch {
    // ignore
  }
}

function ensurePrimaryModeEffectsSlot(App: AppContainer): UiPrimaryModeEffectsStoreLike {
  const runtime = ensureUiModesRuntimeService(App);
  const current = runtime.primaryModeEffects;
  const effects: UiPrimaryModeEffectsStoreLike = current && typeof current === 'object' ? current : {};
  if (runtime.primaryModeEffects !== effects) runtime.primaryModeEffects = effects;
  return effects;
}

function getNoneModeId(): string {
  const modes = isRecord(MODES) ? MODES : null;
  return String(modes?.NONE || 'none');
}

function readModeSlice(value: unknown): RootStateLike['mode'] | null {
  return isRecord(value) ? value : null;
}

function readModesRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function renderPrimaryModeUI(
  App: AppContainer,
  mode?: string | null,
  _modes?: UnknownRecord | null
): void {
  if (!App || typeof App !== 'object') return;

  try {
    const NONE = getNoneModeId();
    const m = mode || NONE;

    // Dataset/class markers
    try {
      const doc = getDocumentMaybe(App);
      if (doc && doc.body) {
        setDataAttr(doc.body, 'wpPrimaryMode', String(m));
        toggleBodyClass(doc, 'wp-primary-mode-active', !!(m && m !== NONE));
      }
    } catch (_) {}
    // React-only path: panel refresh is driven by store/React renders.

    // React-only path: panel refresh is driven by store/React renders.
  } catch (_) {}
}

export function installUiPrimaryMode(
  App: AppContainer
): ((mode?: string | null, _modes?: UnknownRecord | null) => void) | null {
  if (!App || typeof App !== 'object') return null;

  // Store-driven side effects (React-only):
  // - Keep body dataset/class markers in sync with the store mode slice.
  // - Kick best-effort non-React hooks (interior/tools buttons) when mode changes.
  //
  // No UI install shims: this is not a compatibility layer.
  try {
    const effects = ensurePrimaryModeEffectsSlot(App);
    const NONE = getNoneModeId();
    let createdApply = false;

    if (typeof effects.apply !== 'function') {
      createdApply = true;
      let last = '';

      effects.apply = () => {
        try {
          const ms = readModeSlice(readModeStateFromStore(getStoreSurfaceMaybe(App)));
          const cur = (ms && typeof ms.primary === 'string' ? ms.primary : NONE) || NONE;
          if (cur === last) return;
          last = cur;
          renderPrimaryModeUI(App, cur, readModesRecord(MODES));
        } catch (_) {
          // ignore
        }
      };
    }

    if (typeof effects.render !== 'function') {
      effects.render = (mode?: string | null, modes?: UnknownRecord | null) =>
        renderPrimaryModeUI(App, mode, modes);
    }

    if (createdApply && isLiveCleanupHandle(effects.unsub)) {
      callCleanupHandle(effects.unsub);
      effects.unsub = null;
    }

    try {
      effects.apply?.();
    } catch (_) {
      // ignore
    }

    if (createdApply || !isLiveCleanupHandle(effects.unsub)) {
      try {
        const subscribe = getStoreSubscriber(App);
        effects.unsub = subscribe ? subscribe(() => effects.apply?.()) : null;
      } catch (_) {
        effects.unsub = null;
      }
    }

    return effects.render || null;
  } catch (_) {
    return (mode?: string | null, modes?: UnknownRecord | null) => renderPrimaryModeUI(App, mode, modes);
  }
}
