// React UI actions: interior tools (layout/manual/drawers/dividers)

import type { AppContainer, ActionMetaLike, UnknownRecord } from '../../../../../types';
import { formatIdentityValue, readIdentityValue } from '../../../../shared/identity_value_shared.js';

import { getPrimaryMode, enterPrimaryMode, exitPrimaryMode } from './modes_actions.js';
import { getUiFeedback, MODES } from '../../../services/api.js';
import {
  setUiCurrentLayoutType,
  setUiExtDrawerSelection,
  setUiFlag,
  setUiGridDivisionsState,
  setUiGridShelfVariantState,
} from './store_actions.js';
import { getMetaActionFn } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';
import { applyStructuralUiMutation } from './structural_build_refresh_actions.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function emptyRecord(): UnknownRecord {
  return Object.create(null);
}

type InteriorModesLike = Partial<
  Record<'HANDLE' | 'LAYOUT' | 'MANUAL_LAYOUT' | 'BRACE_SHELVES' | 'EXT_DRAWER' | 'DIVIDER', unknown>
>;

function getInteriorModes(): InteriorModesLike {
  return readRecord(MODES) || {};
}

function readInteriorModeId(value: unknown, defaultValue: string): string {
  return typeof value === 'string' && value ? value : defaultValue;
}

function readInteriorChoice(value: unknown, defaultValue: string): string {
  return typeof value === 'string' && value ? value : defaultValue;
}

const INTERIOR_DRAWERS_TOGGLE_BUILD_OPTIONS = { buildTiming: 'coalesced' } as const;

function interactiveStructuralMetaOverrides(app: AppContainer, source: string): ActionMetaLike {
  const interactiveImmediate = getMetaActionFn<(source: string) => ActionMetaLike>(
    app,
    'interactiveImmediate'
  );
  if (typeof interactiveImmediate === 'function') return interactiveImmediate(source);
  return { source, immediate: true };
}

function toast(app: AppContainer, msg: string, kind?: string): void {
  try {
    const fb = getUiFeedback(app);
    fb.toast(msg, kind);
  } catch {
    // ignore
  }
}

function getUiSnap(app: AppContainer): UnknownRecord {
  try {
    const st = readStoreStateMaybe(app);
    return readRecord(isRecord(st) ? st.ui : null) || emptyRecord();
  } catch {
    return emptyRecord();
  }
}

function readCloseDoorsOpts(closeDoors: boolean): UnknownRecord {
  return { closeDoors };
}

function turnOffHandleModeIfNeeded(app: AppContainer): void {
  try {
    const modes = getInteriorModes();
    const HANDLE = readInteriorModeId(modes.HANDLE, 'handle');
    const cur = getPrimaryMode(app);
    if (String(cur) === HANDLE) {
      exitPrimaryMode(app, HANDLE, { preserveDoors: true });
    }
  } catch {
    // ignore
  }
}

export function enterLayoutMode(app: AppContainer, layoutType: unknown): void {
  turnOffHandleModeIfNeeded(app);
  const modes = getInteriorModes();
  const MODE_LAYOUT = readInteriorModeId(modes.LAYOUT, 'layout');
  const selectedLayout = readInteriorChoice(layoutType, 'shelves');

  try {
    const m: ActionMetaLike = {
      source: 'react:interior:layoutType',
      immediate: true,
      noBuild: true,
      noHistory: true,
      noPersist: true,
    };
    setUiCurrentLayoutType(app, selectedLayout, m);
  } catch {
    // ignore
  }

  enterPrimaryMode(app, MODE_LAYOUT, {
    modeOpts: { layoutType: selectedLayout },
    openDoors: true,
    cursor: 'alias',
    toast: 'בחר חלוקה ואז לחץ על תא ליישום',
  });
}

export function enterManualLayoutMode(app: AppContainer, toolId: unknown): void {
  turnOffHandleModeIfNeeded(app);
  const modes = getInteriorModes();
  const MODE_MANUAL = readInteriorModeId(modes.MANUAL_LAYOUT, 'manual_layout');

  enterPrimaryMode(app, MODE_MANUAL, {
    modeOpts: { manualTool: readInteriorChoice(toolId, 'shelf') },
    openDoors: true,
    cursor: 'alias',
    toast: 'חלוקה ידנית: לחץ בתוך הארון להוספה/הסרה',
  });
}

export function toggleBraceShelvesMode(app: AppContainer): void {
  turnOffHandleModeIfNeeded(app);
  const modes = getInteriorModes();
  const MODE_BRACE = readInteriorModeId(modes.BRACE_SHELVES, 'brace_shelves');

  const cur = getPrimaryMode(app);
  if (String(cur) === MODE_BRACE) {
    exitPrimaryMode(app, MODE_BRACE);
    return;
  }

  enterPrimaryMode(app, MODE_BRACE, {
    openDoors: true,
    cursor: 'alias',
    toast: 'מדפי קושרת: לחץ על מדף כדי להפוך אותו לקושרת/רגיל',
  });
}

export function setGridDivisions(app: AppContainer, n: unknown): void {
  const nextN = Number(n);
  const divs = Number.isFinite(nextN) ? nextN : 4;

  try {
    const snap = getUiSnap(app);
    const activeId = snap.activeGridCellId;
    const perCell = snap.perCellGridMap;

    const m: ActionMetaLike = {
      source: 'react:interior:gridDivs',
      immediate: true,
      noBuild: true,
      noHistory: true,
      noPersist: true,
    };

    const activeKey = formatIdentityValue(readIdentityValue(activeId));
    if (activeKey) {
      const base = perCell && typeof perCell === 'object' && !Array.isArray(perCell) ? perCell : {};
      const next = { ...base, [activeKey]: divs };
      setUiGridDivisionsState(app, divs, next, null, m);
      return;
    }

    setUiGridDivisionsState(app, divs, undefined, undefined, m);
  } catch {
    // ignore
  }
}

export function setGridShelfVariant(app: AppContainer, variant: unknown): void {
  const raw = typeof variant === 'string' ? variant : '';
  const v0 = raw.trim().toLowerCase();
  const v = v0 === 'double' || v0 === 'glass' || v0 === 'brace' || v0 === 'regular' ? v0 : 'regular';

  try {
    const m: ActionMetaLike = {
      source: 'react:interior:gridShelfVariant',
      immediate: true,
      noBuild: true,
      noHistory: true,
      noPersist: true,
    };
    setUiGridShelfVariantState(app, v, m);
  } catch {
    // ignore
  }
}

export function enterExtDrawerMode(app: AppContainer, drawerType: unknown, count?: unknown): void {
  turnOffHandleModeIfNeeded(app);
  const modes = getInteriorModes();
  const MODE_EXT = readInteriorModeId(modes.EXT_DRAWER, 'ext_drawer');
  const selectedDrawerType = readInteriorChoice(drawerType, 'regular');

  const snap = getUiSnap(app);
  const curCount = Number(snap.currentExtDrawerCount);
  const c = typeof count === 'number' ? count : Number(count);
  const finalCount = Number.isFinite(c) ? c : Number.isFinite(curCount) ? curCount : 2;

  try {
    const m: ActionMetaLike = {
      source: 'react:interior:extDrawerSelect',
      immediate: true,
      noBuild: true,
      noHistory: true,
      noPersist: true,
    };
    setUiExtDrawerSelection(app, selectedDrawerType, finalCount, m);
  } catch {
    // ignore
  }

  enterPrimaryMode(app, MODE_EXT, {
    modeOpts: { extDrawerType: selectedDrawerType, extDrawerCount: finalCount },
    preserveDoors: true,
    cursor: 'alias',
    toast: 'בחירת מגירה: לחץ על תא להצבה',
  });
}

export function toggleDividerMode(app: AppContainer): void {
  turnOffHandleModeIfNeeded(app);
  const modes = getInteriorModes();
  const MODE_DIV = readInteriorModeId(modes.DIVIDER, 'divider');

  const cur = getPrimaryMode(app);
  if (String(cur) === MODE_DIV) {
    exitPrimaryMode(app, MODE_DIV, readCloseDoorsOpts(false));
    return;
  }

  enterPrimaryMode(app, MODE_DIV, {
    preserveDoors: true,
    cursor: 'alias',
    toast: 'עריכת מחיצות: לחץ על מגירה כדי לשנות מחיצה',
  });
}

export function toggleIntDrawerMode(app: AppContainer): void {
  const uiSnap = getUiSnap(app);
  const enabled = !!uiSnap.internalDrawersEnabled;
  if (!enabled) {
    toast(app, 'הפעל קודם את "מגירות פנימיות" כדי לערוך', 'warn');
    return;
  }

  enterManualLayoutMode(app, 'sketch_int_drawers');
}

export function setInternalDrawersEnabled(
  app: AppContainer,
  on: unknown,
  source = 'react:interior:sketchIntDrawersToggle'
): void {
  const enabled = !!on;
  const uiSnap = getUiSnap(app);
  if (enabled === !!uiSnap.internalDrawersEnabled) return;

  try {
    const m: ActionMetaLike = interactiveStructuralMetaOverrides(app, source);

    applyStructuralUiMutation(
      app,
      source,
      { internalDrawersEnabled: enabled },
      meta => {
        setUiFlag(app, 'internalDrawersEnabled', enabled, meta);
      },
      {
        buildTiming: INTERIOR_DRAWERS_TOGGLE_BUILD_OPTIONS.buildTiming,
        metaOverrides: m,
      }
    );
  } catch {
    // ignore
  }
}
