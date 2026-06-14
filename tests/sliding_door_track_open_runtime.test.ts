import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSlidingDoorTrackOpenPosition } from '../esm/native/runtime/sliding_door_motion.ts';
import { handleCanvasDoorToggleClick } from '../esm/native/services/canvas_picking_toggle_flow.ts';
import {
  tryCloseOpenSlidingTrackDoors,
  tryHandleSlidingTrackDoorToggle,
} from '../esm/native/services/canvas_picking_toggle_flow_shared.ts';
import { syncVisualsNow } from '../esm/native/services/doors_runtime_visuals_doors.ts';

function makeSlidingDoor(index: number, total: number) {
  const totalW = 3;
  const doorW = 1;
  const minX = -1;
  const maxX = 1;
  const step = total > 1 ? (maxX - minX) / (total - 1) : 0;
  return {
    type: 'sliding',
    index,
    total,
    width: doorW,
    minX,
    maxX,
    originalX: minX + step * index,
    originalZ: index % 2 === 0 ? 0.2 : 0.25,
    outerZ: 0.25,
    stackZStep: 0.05,
    group: {
      position: { x: minX + step * index, y: 0, z: index % 2 === 0 ? 0.2 : 0.25 },
      rotation: { y: 0 },
      userData: { partId: `sliding_door_${index + 1}` },
    },
  } as any;
}

test('sliding track open stays inside the wardrobe width', () => {
  const rightDoor = makeSlidingDoor(1, 2);

  const track = resolveSlidingDoorTrackOpenPosition(rightDoor, 3, 1, rightDoor.originalZ);

  assert.equal(track.finalX, -1);
  assert.equal(track.finalZ, rightDoor.originalZ);
});

test('sliding track open handles three doors by moving side doors inward and the middle door to a side', () => {
  const left = makeSlidingDoor(0, 3);
  const middle = makeSlidingDoor(1, 3);
  const right = makeSlidingDoor(2, 3);

  assert.equal(resolveSlidingDoorTrackOpenPosition(left, 3, 1, left.originalZ).finalX, 0);
  assert.equal(resolveSlidingDoorTrackOpenPosition(right, 3, 1, right.originalZ).finalX, 0);
  assert.equal(resolveSlidingDoorTrackOpenPosition(middle, 3, 1, middle.originalZ).finalX, 1);
});

function makeAppWithSlidingDoors(doors: any[], state: any = { runtime: { doorsOpen: true } }) {
  const App: any = {
    store: {
      getState: () => state,
      setRuntime: (patch: Record<string, unknown>) => Object.assign(state.runtime, patch),
    },
    services: {
      doors: { runtime: {} },
      tools: { setDrawersOpenId: (value: unknown) => (App.drawerOpenId = value) },
      platform: {
        triggerRender: () => undefined,
        ensureRenderLoop: () => undefined,
      },
    },
    render: { doorsArray: doors, drawersArray: [] },
  };
  return App;
}

test('sliding click opens only the clicked sliding door in track mode', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  const state = { runtime: { doorsOpen: true } };
  const App = makeAppWithSlidingDoors([left, right], state);

  assert.equal(
    tryHandleSlidingTrackDoorToggle({ App, primaryHitObject: right.group, effectiveDoorId: null }),
    true
  );
  assert.equal(state.runtime.doorsOpen, false);
  assert.deepEqual(
    App.render.doorsArray.map((d: any) => !!d.isOpen),
    [false, true]
  );
  assert.equal(right.slidingOpenMode, 'track');
  assert.equal(right.noGlobalOpen, true);
  assert.equal(App.drawerOpenId, null);
});

test('sliding click closes an existing track-open door instead of switching to another door', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  const App = makeAppWithSlidingDoors([left, right], { runtime: { doorsOpen: false } });

  right.isOpen = true;
  right.noGlobalOpen = true;
  right.slidingOpenMode = 'track';
  right.__slidingOpenMode = 'track';

  assert.equal(
    tryHandleSlidingTrackDoorToggle({ App, primaryHitObject: left.group, effectiveDoorId: null }),
    true
  );
  assert.deepEqual(
    App.render.doorsArray.map((d: any) => !!d.isOpen),
    [false, false]
  );
  assert.equal(left.slidingOpenMode, undefined);
  assert.equal(right.slidingOpenMode, undefined);
  assert.equal(right.noGlobalOpen, false);
});

test('sliding cabinet-space click closes an existing track-open door before global open toggle can run', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  const App = makeAppWithSlidingDoors([left, right], {
    runtime: { doorsOpen: false, globalClickMode: true },
  });

  left.isOpen = true;
  left.noGlobalOpen = true;
  left.slidingOpenMode = 'track';
  left.__slidingOpenMode = 'track';
  let globalToggleCount = 0;
  App.services.doors.toggle = () => {
    globalToggleCount += 1;
    App.store.getState().runtime.doorsOpen = !App.store.getState().runtime.doorsOpen;
  };

  handleCanvasDoorToggleClick({
    App,
    primaryMode: 'none',
    primaryHitObject: { userData: { partId: 'wardrobe_space' } } as any,
    effectiveDoorId: null,
    foundPartId: 'wardrobe_space',
  });

  assert.equal(globalToggleCount, 0);
  assert.equal(App.store.getState().runtime.doorsOpen, false);
  assert.deepEqual(
    App.render.doorsArray.map((d: any) => !!d.isOpen),
    [false, false]
  );
  assert.equal(left.slidingOpenMode, undefined);
});

test('sliding close helper does nothing when there is no track-open sliding door', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  const App = makeAppWithSlidingDoors([left, right], { runtime: { doorsOpen: false } });

  assert.equal(tryCloseOpenSlidingTrackDoors(App), false);
  assert.deepEqual(
    App.render.doorsArray.map((d: any) => !!d.isOpen),
    [false, false]
  );
});

test('normal global-open sliding visual sync stays inside the wardrobe bounds', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  left.isOpen = true;
  right.isOpen = true;

  const App = makeAppWithSlidingDoors([left, right], {
    runtime: { doorsOpen: true, globalClickMode: true },
  });
  App.services.platform.getDimsM = () => ({ w: 3, h: 2, d: 0.6 });

  syncVisualsNow(App, { open: true });

  assert.ok(left.group.position.x >= left.minX && left.group.position.x <= left.maxX);
  assert.ok(right.group.position.x >= right.minX && right.group.position.x <= right.maxX);
});

test('sliding edit/export-style all-open state hides sliding doors instead of moving them outside', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  left.isOpen = true;
  left.noGlobalOpen = true;
  left.slidingOpenMode = 'track';
  right.isOpen = true;

  const App = makeAppWithSlidingDoors([left, right], {
    runtime: { doorsOpen: true, globalClickMode: true },
  });
  App.services.platform.getDimsM = () => ({ w: 3, h: 2, d: 0.6 });

  syncVisualsNow(App, { open: true, slidingHideOpen: true });

  assert.equal(left.group.visible, false, 'left sliding door is hidden for edit/export open views');
  assert.equal(right.group.visible, false, 'right sliding door is hidden for edit/export open views');
  assert.ok(left.group.position.x >= left.minX && left.group.position.x <= left.maxX);
  assert.ok(right.group.position.x >= right.minX && right.group.position.x <= right.maxX);

  syncVisualsNow(App, { open: true });

  assert.notEqual(left.group.visible, false, 'left sliding door is restored after edit/export hidden view');
  assert.notEqual(right.group.visible, false, 'right sliding door is restored after edit/export hidden view');
  assert.ok(left.group.position.x >= left.minX && left.group.position.x <= left.maxX);
  assert.ok(right.group.position.x >= right.minX && right.group.position.x <= right.maxX);
});

test('legacy slidingWideOpen request hides sliding doors and does not use an outside pose', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  left.isOpen = true;
  right.isOpen = true;

  const App = makeAppWithSlidingDoors([left, right], {
    runtime: { doorsOpen: true, globalClickMode: true },
  });
  App.services.platform.getDimsM = () => ({ w: 3, h: 2, d: 0.6 });

  syncVisualsNow(App, { open: true, slidingWideOpen: true });

  assert.equal(left.group.visible, false);
  assert.equal(right.group.visible, false);
  assert.ok(left.group.position.x >= left.minX && left.group.position.x <= left.maxX);
  assert.ok(right.group.position.x >= right.minX && right.group.position.x <= right.maxX);
});

test('sliding track-open door stays visible and open during internal drawer divider/edit visuals', () => {
  const left = makeSlidingDoor(0, 2);
  const right = makeSlidingDoor(1, 2);
  left.isOpen = true;
  left.noGlobalOpen = true;
  left.slidingOpenMode = 'track';
  left.__slidingOpenMode = 'track';
  left.group.visible = true;

  const App = makeAppWithSlidingDoors([left, right], {
    runtime: { doorsOpen: false, globalClickMode: true },
    mode: { primary: 'manual_layout', opts: { manualTool: 'sketch_int_drawers' } },
    config: { wardrobeType: 'sliding' },
  });
  App.services.platform.getDimsM = () => ({ w: 3, h: 2, d: 0.6 });

  syncVisualsNow(App, { open: false });

  assert.notEqual(
    left.group.visible,
    false,
    'track-open sliding door must not be hidden in drawer edit visuals'
  );
  assert.equal(left.group.position.x, 1);
  assert.equal(left.group.position.z, left.originalZ);
});
