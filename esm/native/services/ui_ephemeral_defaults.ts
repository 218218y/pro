// Native ESM: UI ephemeral defaults seeding.
//
// Pure functions, explicit invocation only.
// No side effects on import and no reliance on window App/global-scope App.

import type { ActionMetaLike, AppContainer, UiSlicePatch, UiStateLike } from '../../../types';
import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';

function assertApp(app: unknown): asserts app is AppContainer {
  if (!app || typeof app !== 'object') {
    throw new Error('[WardrobePro][ESM] ui_ephemeral_defaults requires an app object');
  }
}

function hasOwnKeys(v: unknown): boolean {
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
}

// Helper: patch UI softly (no build/autosave/persist/history)
function applyUiSoftPatch(app: AppContainer, uiPartial: UiSlicePatch, meta?: ActionMetaLike): void {
  const patch: UiSlicePatch = uiPartial && typeof uiPartial === 'object' ? { ...uiPartial } : {};
  if (!hasOwnKeys(patch)) return;

  try {
    const baseMeta: ActionMetaLike =
      meta && typeof meta === 'object' ? { ...meta } : { source: 'uiDefaults' };
    patchUiSoft(app, patch, baseMeta);
  } catch (_) {
    // ignore
  }
}

// Helper: read UI state from slice store (preferred) or from raw store state (fallback)
function readUi(app: AppContainer): UiStateLike {
  try {
    return readUiStateFromApp(app);
  } catch (_) {
    return {};
  }
}

export function seedUiEphemeralDefaults(app: AppContainer): true {
  assertApp(app);

  // Layout defaults
  try {
    const ui = readUi(app);
    const needsLayout = typeof ui.currentLayoutType !== 'string';
    const needsDivs = typeof ui.currentGridDivisions !== 'number';
    const needsShelfVariant = typeof ui.currentGridShelfVariant !== 'string';
    if (needsLayout || needsDivs || needsShelfVariant) {
      const patch: UiSlicePatch = {};
      if (needsLayout) patch.currentLayoutType = 'shelves';
      if (needsDivs) patch.currentGridDivisions = 6;
      if (needsShelfVariant) patch.currentGridShelfVariant = 'regular';
      applyUiSoftPatch(app, patch, { source: 'boot:uiDefaults:layout' });
    }
  } catch (_) {}

  // Per-cell grid defaults
  try {
    const ui2 = readUi(app);
    const needsMap =
      !ui2.perCellGridMap || typeof ui2.perCellGridMap !== 'object' || Array.isArray(ui2.perCellGridMap);
    const needsActive = !(typeof ui2.activeGridCellId === 'string' || ui2.activeGridCellId === null);

    if (needsMap || needsActive) {
      const patch2: UiSlicePatch = {};
      if (needsMap) patch2.perCellGridMap = {};
      if (needsActive) patch2.activeGridCellId = null;
      applyUiSoftPatch(app, patch2, { source: 'boot:uiDefaults:perCellGrid' });
    }
  } catch (_) {}

  // External drawers defaults
  try {
    const ui3 = readUi(app);
    const needsType = typeof ui3.currentExtDrawerType !== 'string';
    const needsCount = typeof ui3.currentExtDrawerCount !== 'number';

    if (needsType || needsCount) {
      const patch3: UiSlicePatch = {};
      if (needsType) patch3.currentExtDrawerType = 'regular';
      if (needsCount) patch3.currentExtDrawerCount = 1;
      applyUiSoftPatch(app, patch3, { source: 'boot:uiDefaults:extDrawers' });
    }
  } catch (_) {}

  // Curtain defaults
  try {
    const ui4 = readUi(app);
    if (typeof ui4.currentCurtainChoice !== 'string') {
      applyUiSoftPatch(app, { currentCurtainChoice: 'none' }, { source: 'boot:uiDefaults:curtainChoice' });
    }
  } catch (_) {}

  // Mirror draft defaults (UI-only inputs for paint mode)
  try {
    const ui5 = readUi(app);
    const patch5: UiSlicePatch = {};
    if (typeof ui5.currentMirrorDraftHeightCm !== 'string') patch5.currentMirrorDraftHeightCm = '';
    if (typeof ui5.currentMirrorDraftWidthCm !== 'string') patch5.currentMirrorDraftWidthCm = '';
    if (hasOwnKeys(patch5)) {
      applyUiSoftPatch(app, patch5, { source: 'boot:uiDefaults:mirrorDraft' });
    }
  } catch (_) {}

  return true;
}

export function isUiEphemeralDefaultsSeeded(app: AppContainer): boolean {
  try {
    assertApp(app);
    const ui = readUi(app);
    return !!(
      typeof ui.currentLayoutType === 'string' &&
      typeof ui.currentGridDivisions === 'number' &&
      typeof ui.currentGridShelfVariant === 'string' &&
      ui.perCellGridMap &&
      typeof ui.perCellGridMap === 'object' &&
      !Array.isArray(ui.perCellGridMap)
    );
  } catch (_) {
    return false;
  }
}
