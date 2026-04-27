import type { AppContainer } from '../../../types';
import { MODES } from '../runtime/api.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { __wp_primaryMode, __wp_triggerRender } from './canvas_picking_core_helpers.js';
import { resetAllEditModes } from './edit_state.js';

type RecordMap = Record<string, unknown>;

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getModeConst(key: 'NONE' | 'SCREEN_NOTE', fallback: string): string {
  const value = isRecord(MODES) ? MODES[key] : null;
  return typeof value === 'string' && value ? value : fallback;
}

export function resetCanvasPickingEmptyClick(args: {
  App: AppContainer;
  primaryHitObject: RecordMap | null;
  isPaintMode: boolean;
  isGrooveEditMode: boolean;
  isSplitEditMode: boolean;
  isLayoutEditMode: boolean;
  isManualLayoutMode: boolean;
  isBraceShelvesMode: boolean;
  isExtDrawerEditMode: boolean;
  isIntDrawerEditMode: boolean;
  isDividerEditMode: boolean;
  isHandleEditMode: boolean;
  isHingeEditMode: boolean;
  isRemoveDoorMode: boolean;
}): boolean {
  const {
    App,
    primaryHitObject,
    isPaintMode,
    isGrooveEditMode,
    isSplitEditMode,
    isLayoutEditMode,
    isManualLayoutMode,
    isBraceShelvesMode,
    isExtDrawerEditMode,
    isIntDrawerEditMode,
    isDividerEditMode,
    isHandleEditMode,
    isHingeEditMode,
    isRemoveDoorMode,
  } = args;

  if (primaryHitObject && primaryHitObject.name !== 'floor' && primaryHitObject.name !== 'smartFloor') {
    return false;
  }

  const NONE = getModeConst('NONE', 'none');
  const NOTES = getModeConst('SCREEN_NOTE', 'screen_note');
  const pmNow = __wp_primaryMode(App) || NONE;
  const isAnyEditMode = pmNow !== NONE && pmNow !== NOTES;

  if (
    isAnyEditMode ||
    isPaintMode ||
    isGrooveEditMode ||
    isSplitEditMode ||
    isLayoutEditMode ||
    isManualLayoutMode ||
    isBraceShelvesMode ||
    isExtDrawerEditMode ||
    isIntDrawerEditMode ||
    isDividerEditMode ||
    isHandleEditMode ||
    isHingeEditMode ||
    isRemoveDoorMode
  ) {
    const resetAll = typeof resetAllEditModes === 'function' ? resetAllEditModes : null;
    if (resetAll) {
      resetAll(App);
    } else {
      try {
        setModePrimary(App, NONE, {}, { source: 'canvasPicking:emptyClick' });
      } catch {
        // ignore
      }
    }
    __wp_triggerRender(App, true);
  }

  return true;
}
