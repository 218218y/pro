// Native ESM: UI ephemeral defaults seeding.
//
// Pure functions, explicit invocation only.
// No side effects on import and no reliance on window App/global-scope App.

import type { ActionMetaLike, AppContainer, UiSlicePatch, UiStateLike } from '../../../types';
import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { reportError } from '../runtime/errors.js';

function assertApp(app: unknown): asserts app is AppContainer {
  if (!app || typeof app !== 'object') {
    throw new Error('[WardrobePro][ESM] ui_ephemeral_defaults requires an app object');
  }
}

function hasOwnKeys(v: unknown): boolean {
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
}

function reportUiEphemeralDefaultsFailure(app: AppContainer, op: string, error: unknown): void {
  try {
    reportError(
      app,
      error,
      { where: 'native/services/ui_ephemeral_defaults', op, fatal: false },
      { consoleFallback: false }
    );
  } catch {
    // UI defaults are boot helpers; diagnostics must not make boot fail.
  }
}

// Patch UI softly (no build/autosave/persist/history).
function applyUiSoftPatch(app: AppContainer, uiPartial: UiSlicePatch, meta?: ActionMetaLike): void {
  const patch: UiSlicePatch = uiPartial && typeof uiPartial === 'object' ? { ...uiPartial } : {};
  if (!hasOwnKeys(patch)) return;

  try {
    const baseMeta: ActionMetaLike =
      meta && typeof meta === 'object' ? { ...meta } : { source: 'uiDefaults' };
    patchUiSoft(app, patch, baseMeta);
  } catch (error) {
    reportUiEphemeralDefaultsFailure(app, 'patchUiSoft.ownerRejected', error);
  }
}

// Read canonical UI state. Early boot/test harness gaps remain empty defaults, not errors.
function readUi(app: AppContainer): UiStateLike {
  try {
    return readUiStateFromApp(app);
  } catch {
    return {};
  }
}

type UiDefaultsPatchBuilder = (ui: UiStateLike) => UiSlicePatch;

function seedUiDefaultSection(app: AppContainer, source: string, buildPatch: UiDefaultsPatchBuilder): void {
  try {
    const patch = buildPatch(readUi(app));
    if (hasOwnKeys(patch)) applyUiSoftPatch(app, patch, { source });
  } catch (error) {
    reportUiEphemeralDefaultsFailure(app, `${source}.seedFailed`, error);
  }
}

export function seedUiEphemeralDefaults(app: AppContainer): true {
  assertApp(app);

  seedUiDefaultSection(app, 'boot:uiDefaults:layout', ui => {
    const patch: UiSlicePatch = {};
    if (typeof ui.currentLayoutType !== 'string') patch.currentLayoutType = 'shelves';
    if (typeof ui.currentGridDivisions !== 'number') patch.currentGridDivisions = 6;
    if (typeof ui.currentGridShelfVariant !== 'string') patch.currentGridShelfVariant = 'regular';
    return patch;
  });

  seedUiDefaultSection(app, 'boot:uiDefaults:perCellGrid', ui => {
    const patch: UiSlicePatch = {};
    if (!ui.perCellGridMap || typeof ui.perCellGridMap !== 'object' || Array.isArray(ui.perCellGridMap)) {
      patch.perCellGridMap = {};
    }
    if (!(typeof ui.activeGridCellId === 'string' || ui.activeGridCellId === null)) {
      patch.activeGridCellId = null;
    }
    return patch;
  });

  seedUiDefaultSection(app, 'boot:uiDefaults:extDrawers', ui => {
    const patch: UiSlicePatch = {};
    if (typeof ui.currentExtDrawerType !== 'string') patch.currentExtDrawerType = 'regular';
    if (typeof ui.currentExtDrawerCount !== 'number') patch.currentExtDrawerCount = 1;
    return patch;
  });

  seedUiDefaultSection(app, 'boot:uiDefaults:curtainChoice', ui =>
    typeof ui.currentCurtainChoice !== 'string' ? { currentCurtainChoice: 'none' } : {}
  );

  seedUiDefaultSection(app, 'boot:uiDefaults:mirrorDraft', ui => {
    const patch: UiSlicePatch = {};
    if (typeof ui.currentMirrorDraftHeightCm !== 'string') patch.currentMirrorDraftHeightCm = '';
    if (typeof ui.currentMirrorDraftWidthCm !== 'string') patch.currentMirrorDraftWidthCm = '';
    return patch;
  });

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
  } catch {
    return false;
  }
}
