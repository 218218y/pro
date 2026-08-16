import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCanvasPickingClickModeState } from '../esm/native/services/canvas_picking_click_mode_state.ts';

const MODE_CASES = [
  ['paint', '__isPaintMode'],
  ['groove', '__isGrooveEditMode'],
  ['split', '__isSplitEditMode'],
  ['layout', '__isLayoutEditMode'],
  ['manual_layout', '__isManualLayoutMode'],
  ['brace_shelves', '__isBraceShelvesMode'],
  ['cell_dims', '__isCellDimsMode'],
  ['measure', '__isMeasureMode'],
  ['ext_drawer', '__isExtDrawerEditMode'],
  ['divider', '__isDividerEditMode'],
  ['handle', '__isHandleEditMode'],
  ['hinge', '__isHingeEditMode'],
  ['remove_door', '__isRemoveDoorMode'],
  ['door_trim', '__isDoorTrimMode'],
] as const;

const MODE_FLAGS = MODE_CASES.map(([, flag]) => flag);

function createApp(primary: string) {
  const state = {
    ui: {},
    config: {},
    mode: { primary },
    runtime: {},
    meta: {},
  };
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
  } as any;
}

test('canvas click mode state maps every public picking mode to exactly its owned flag', () => {
  for (const [primary, activeFlag] of MODE_CASES) {
    const state = resolveCanvasPickingClickModeState(createApp(primary));
    assert.equal(state.__pm, primary, `primary mode must remain ${primary}`);
    for (const flag of MODE_FLAGS) {
      assert.equal(state[flag], flag === activeFlag, `${primary} must map ${flag} deterministically`);
    }
    assert.equal(state.__isIntDrawerEditMode, false);
  }
});

test('canvas click mode state fails closed for an unknown mode', () => {
  const state = resolveCanvasPickingClickModeState(createApp('future_mode'));
  assert.equal(state.__pm, 'future_mode');
  for (const flag of MODE_FLAGS) assert.equal(state[flag], false);
  assert.equal(state.__isIntDrawerEditMode, false);
});
