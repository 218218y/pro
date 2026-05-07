import test from 'node:test';
import assert from 'node:assert/strict';

import { shiftWardrobeRange } from '../esm/native/builder/build_stack_shift_runtime.ts';

type MockObject = {
  position: { y: number; z: number };
  userData?: Record<string, unknown>;
};

function makeApp(children: MockObject[]) {
  return {
    render: {
      wardrobeGroup: { children },
      drawersArray: [],
      doorsArray: [],
    },
  } as never;
}

test('stack split upper shift keeps global free-placement sketch boxes at their committed hover coordinates', () => {
  const upperBody: MockObject = {
    position: { y: 0.4, z: 0.01 },
    userData: { partId: 'body_left' },
  };
  const freeBoxBottom: MockObject = {
    position: { y: 0.25, z: 0.02 },
    userData: { partId: 'sketch_box_free_0_sbf_floor_bottom' },
  };
  const freeBoxSide: MockObject = {
    position: { y: 0.85, z: 0.03 },
    userData: { partId: 'sketch_box_free_0_sbf_air_side' },
  };
  const upperDoor: MockObject = {
    position: { y: 0.7, z: 0.04 },
    userData: { partId: 'door_1' },
  };

  const App = makeApp([upperBody, freeBoxBottom, freeBoxSide, upperDoor]);

  shiftWardrobeRange({
    App,
    fromIdx: 0,
    toIdx: 4,
    dy: 1.2,
    dz: 0.11,
    adjustHandleAbsY: false,
  });

  assert.deepEqual(upperBody.position, { y: 1.6, z: 0.12 });
  assert.deepEqual(upperDoor.position, { y: 1.9, z: 0.15 });
  assert.deepEqual(freeBoxBottom.position, { y: 0.25, z: 0.02 });
  assert.deepEqual(freeBoxSide.position, { y: 0.85, z: 0.03 });
});
