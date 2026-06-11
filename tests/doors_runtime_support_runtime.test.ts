import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOpenDoorModuleKeys,
  isInteriorDoorEditModeActive,
  shouldForceSketchFreeBoxDoorsOpen,
  vecCopy,
} from '../esm/native/runtime/doors_runtime_support.ts';
import { getDoorsArray } from '../esm/native/runtime/render_access.ts';

test('doors runtime support vecCopy only applies finite coordinates on plain-object fallback', () => {
  const dst: Record<string, unknown> = { x: 1, y: 2, z: 3 };
  const src = { x: 4, y: Number.NaN, z: Number.POSITIVE_INFINITY };

  vecCopy(dst, src);

  assert.deepEqual(dst, { x: 4, y: 2, z: 3 });
});

test('doors runtime support reads open door module keys through render surface arrays', () => {
  const App: Record<string, unknown> = {};
  const doors = getDoorsArray(App);
  doors.push(
    { isOpen: true, group: { userData: { moduleIndex: 12 } } } as never,
    { isOpen: true, group: { userData: { moduleIndex: 'left-bay' } } } as never,
    { isOpen: false, group: { userData: { moduleIndex: 'closed' } } } as never,
    { isOpen: true, group: { userData: { moduleIndex: null } } } as never
  );

  assert.deepEqual(Array.from(getOpenDoorModuleKeys(App)).sort(), ['12', 'left-bay']);
});

test('sketch external-drawer edit mode opens free-box doors like other interior edit tools', () => {
  const App: Record<string, unknown> = {
    store: {
      getState: () => ({
        mode: { primary: 'manual_layout', opts: { manualTool: 'sketch_ext_drawers:3' } },
      }),
    },
  };

  assert.equal(isInteriorDoorEditModeActive(App), true);
  assert.equal(
    shouldForceSketchFreeBoxDoorsOpen(
      'sketch_ext_drawers:3',
      { __wpSketchBoxDoor: true, __wpSketchFreePlacement: true },
      { interiorDoorEditActive: isInteriorDoorEditModeActive(App) }
    ),
    true
  );
});
