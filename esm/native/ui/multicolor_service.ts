// WardrobePro Multi-color Paint Mode (React-safe service)
//
// Stage 12: The React UI uses multi-color paint mode, but it must not depend on
// the old DOM widget module. This file contains ONLY logic and App actions.
//
// Notes:
// - No DOM lookups here.
// - No widget rendering.
// - Safe to import from React components.

import type { ActionMetaLike, AppContainer } from '../../../types';

import {
  setCfgMultiColorMode,
  getTools,
  getUiFeedback,
  MODES,
  readConfigStateFromApp,
  readModeStateFromApp,
  readUiStateFromApp,
  setModePrimary,
  setMultiModeViaActions,
  setUiScalarSoft,
} from '../services/api.js';

type MulticolorActionMeta = ActionMetaLike & { source?: string; immediate?: boolean };

type MulticolorModeState = { primary?: string };
type MulticolorConfigState = { isMultiColorMode?: boolean };
type MulticolorUiState = { currentCurtainChoice?: string };

export type MulticolorStateSummary = {
  paintActive: boolean;
  isMultiColorMode?: boolean;
  currentCurtainChoice?: string;
};

function _safe(_label: string, fn: () => void): void {
  try {
    fn();
  } catch {
    // ignore
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readModeState(App: AppContainer): MulticolorModeState | null {
  try {
    const mode = readModeStateFromApp(App);
    return isRecord(mode) ? mode : null;
  } catch {
    return null;
  }
}

function readConfigState(App: AppContainer): MulticolorConfigState | null {
  try {
    const cfg = readConfigStateFromApp(App);
    return isRecord(cfg) ? cfg : null;
  } catch {
    return null;
  }
}

function readUiState(App: AppContainer): MulticolorUiState | null {
  try {
    const ui = readUiStateFromApp(App);
    return isRecord(ui) ? ui : null;
  } catch {
    return null;
  }
}

function readModes(): { PAINT: string; NONE: string } {
  const modes = isRecord(MODES) ? MODES : null;
  return {
    PAINT: typeof modes?.PAINT === 'string' ? modes.PAINT : 'paint',
    NONE: typeof modes?.NONE === 'string' ? modes.NONE : 'none',
  };
}

function normalizeMeta(meta: MulticolorActionMeta | undefined, source: string): MulticolorActionMeta {
  return meta && typeof meta === 'object' ? meta : { source, immediate: true };
}

export function isPaintModeActive(App: AppContainer): boolean {
  try {
    const { PAINT, NONE } = readModes();
    const mode = readModeState(App);
    const cur = mode && typeof mode.primary === 'string' ? mode.primary : NONE;
    return String(cur || NONE) === String(PAINT);
  } catch {
    return false;
  }
}

export function setMultiEnabled(App: AppContainer, next: boolean, meta?: MulticolorActionMeta): void {
  const m = normalizeMeta(meta, 'ui:multiColorToggle');

  _safe('setMultiEnabled', () => {
    setMultiModeViaActions(App, !!next, m);
    setCfgMultiColorMode(App, !!next, m);
  });
}

export function setCurtainChoice(App: AppContainer, id: unknown): void {
  const next = String(id ?? '').trim();
  if (!next) return;

  _safe('setCurtainChoice', () => {
    setUiScalarSoft(App, 'currentCurtainChoice', next, {
      source: 'ui:multicolor:setCurtainChoice',
      immediate: true,
    });
  });
}

export function exitPaintMode(App: AppContainer): void {
  _safe('exitPaintMode', () => {
    const { NONE } = readModes();
    setModePrimary(App, NONE, {}, { source: 'ui:multicolor:exitPaintMode', immediate: true });
  });

  _safe('exitPaintMode.tools', () => {
    const tools = getTools(App);
    if (typeof tools.setPaintColor === 'function') tools.setPaintColor(null);
  });

  _safe('exitPaintMode.toast', () => {
    const fb = getUiFeedback(App);
    if (typeof fb.updateEditStateToast === 'function') {
      fb.updateEditStateToast(null, false);
    }
  });
}

// Utility: small helper for debugging from console without exposing App on window.
export function describeMultiState(App: AppContainer): MulticolorStateSummary {
  const cfg = readConfigState(App);
  const ui = readUiState(App);

  return {
    paintActive: isPaintModeActive(App),
    isMultiColorMode: cfg ? !!cfg.isMultiColorMode : undefined,
    currentCurtainChoice:
      ui && typeof ui.currentCurtainChoice === 'string' ? ui.currentCurtainChoice : undefined,
  };
}
