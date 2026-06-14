import test from 'node:test';
import assert from 'node:assert/strict';

import { captureSnapshot, applySnapshot } from '../esm/native/services/doors_runtime_lifecycle_shared.ts';
import { setDoorsOpen, toggleDoors } from '../esm/native/services/doors_runtime_lifecycle_global.ts';
import {
  holdOpenForEdit,
  releaseEditHold,
} from '../esm/native/services/doors_runtime_lifecycle_edit_hold.ts';
import {
  captureLocalOpenStateBeforeBuild,
  applyLocalOpenStateAfterBuild,
  closeDrawerById,
} from '../esm/native/services/doors_runtime_lifecycle_local.ts';
import { ensureDoorsRuntimeDefaults } from '../esm/native/services/doors_runtime_shared.ts';

function createApp(
  args: {
    runtime?: Record<string, unknown>;
    config?: Record<string, unknown>;
    mode?: Record<string, unknown>;
  } = {}
) {
  const state = {
    ui: {},
    config: { DOOR_DELAY_MS: 250, wardrobeType: 'hinged', ...(args.config || {}) },
    runtime: { doorsOpen: false, globalClickMode: false, ...(args.runtime || {}) },
    mode: { primary: 'none', ...(args.mode || {}) },
    meta: { version: 0, updatedAt: 0, dirty: false },
  };
  const renderCalls: boolean[] = [];
  const doorStatusCalls: boolean[] = [];
  return {
    state,
    App: {
      store: {
        getState: () => state,
        patch: () => undefined,
        setRuntime: (patch: Record<string, unknown>) => Object.assign(state.runtime, patch),
      },
      actions: {
        meta: {
          transient: (_: unknown, source: string) => ({ source }),
        },
        runtime: {
          setDoorsOpen(open: boolean, opts?: { ts?: number }) {
            state.runtime.doorsOpen = !!open;
            if (opts && typeof opts.ts === 'number') state.runtime.doorsLastToggleTime = opts.ts;
          },
          patch(patch: Record<string, unknown>) {
            Object.assign(state.runtime, patch);
          },
        },
      },
      browser: {
        setDoorStatusCss(open: boolean) {
          doorStatusCalls.push(!!open);
        },
      },
      services: {
        platform: {
          ensureRenderLoop() {
            return true;
          },
          triggerRender(updateShadows?: boolean) {
            renderCalls.push(!!updateShadows);
          },
        },
      },
      render: {
        doorsArray: [] as any[],
        drawersArray: [] as any[],
      },
    } as any,
    renderCalls,
    doorStatusCalls,
  };
}

test('doors lifecycle shared snapshot round-trips door and drawer local-open state by stable keys', () => {
  const { App } = createApp();
  App.render.doorsArray.push(
    { id: 'd-1', isOpen: true },
    { group: { userData: { partId: 'door-part-2' } }, isOpen: false },
    { group: { name: 'fallback-door' }, isOpen: true }
  );
  App.render.drawersArray.push(
    { drawerId: 'dr-1', isOpen: true },
    { group: { userData: { partId: 'drawer-part-2' } }, isOpen: false }
  );

  const snap = captureSnapshot(App, true);

  App.render.doorsArray[0].isOpen = false;
  App.render.doorsArray[1].isOpen = true;
  App.render.doorsArray[2].isOpen = false;
  App.render.drawersArray[0].isOpen = false;
  App.render.drawersArray[1].isOpen = true;

  applySnapshot(App, snap);

  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [true, false, true]
  );
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [true, false]
  );
});

test('doors lifecycle global close delays for open internal drawers and immediately closes noGlobalOpen doors', () => {
  const { App, state, renderCalls, doorStatusCalls } = createApp({ runtime: { doorsOpen: true } });
  const runtime = ensureDoorsRuntimeDefaults(App);
  App.render.doorsArray.push(
    { id: 'door-1', isOpen: true, noGlobalOpen: true },
    { id: 'door-2', isOpen: true, type: 'hinged' }
  );
  App.render.drawersArray.push({ id: 'int-1', isOpen: true, isInternal: true });

  setDoorsOpen(App, false, { touch: true });

  assert.equal(state.runtime.doorsOpen, false);
  assert.equal(App.render.doorsArray[0].isOpen, false);
  assert.ok(runtime.closeDelayUntil >= (state.runtime.doorsLastToggleTime as number));
  assert.equal(doorStatusCalls.at(-1), false);
  assert.equal(renderCalls.at(-1), true);

  toggleDoors(App, { touch: true });
  assert.equal(state.runtime.doorsOpen, true);
  assert.equal(doorStatusCalls.at(-1), true);
});

test('doors lifecycle global sliding transitions clear stale track-open markers', () => {
  const { App } = createApp({
    runtime: { doorsOpen: false, globalClickMode: true },
    config: { wardrobeType: 'sliding' },
  });

  App.render.doorsArray.push(
    {
      id: 'sliding_door_1',
      type: 'sliding',
      isOpen: true,
      noGlobalOpen: true,
      slidingOpenMode: 'track',
      __slidingOpenMode: 'track',
      slidingTrackOpenSide: 'left',
      __slidingTrackOpenSide: 'left',
    },
    { id: 'sliding_door_2', type: 'sliding', isOpen: false }
  );

  setDoorsOpen(App, true, { touch: true, forceUpdate: true });

  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [true, true]
  );
  assert.equal(App.render.doorsArray[0].noGlobalOpen, false);
  assert.equal(App.render.doorsArray[0].slidingOpenMode, undefined);
  assert.equal(App.render.doorsArray[0].__slidingOpenMode, undefined);
  assert.equal(App.render.doorsArray[0].slidingTrackOpenSide, undefined);
  assert.equal(App.render.doorsArray[0].__slidingTrackOpenSide, undefined);

  setDoorsOpen(App, false, { touch: true, forceUpdate: true });

  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [false, false]
  );
  assert.equal(App.render.doorsArray[0].noGlobalOpen, false);
  assert.equal(App.render.doorsArray[0].slidingOpenMode, undefined);
});

test('doors lifecycle edit hold snapshots and restores door/drawer state only when mode is none', () => {
  const { App, renderCalls, state } = createApp({ mode: { primary: 'none' } });
  App.render.doorsArray.push({ id: 'd1', isOpen: false }, { id: 'd2', isOpen: true });
  App.render.drawersArray.push({ id: 'dr1', isOpen: false });

  holdOpenForEdit(App, { includeDrawers: true });
  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [true, true]
  );
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [true]
  );

  App.render.doorsArray[0].isOpen = true;
  App.render.doorsArray[1].isOpen = true;
  App.render.drawersArray[0].isOpen = true;

  releaseEditHold(App, { restore: true });
  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [false, true]
  );
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [false]
  );
  assert.equal(ensureDoorsRuntimeDefaults(App).editHold.active, false);

  holdOpenForEdit(App, { includeDrawers: false });
  state.mode.primary = 'paint';
  releaseEditHold(App, { restore: true });
  assert.equal(ensureDoorsRuntimeDefaults(App).editHold.active, true);
  assert.ok(renderCalls.length >= 2);
});

test('doors lifecycle local-open capture reapplies snapshot after build and closes drawers by stable ids', () => {
  const { App, renderCalls } = createApp();
  App.render.doorsArray.push({ id: 'd1', isOpen: true }, { group: { name: 'fallback' }, isOpen: false });
  App.render.drawersArray.push(
    {
      id: 'drawer-1',
      group: { position: { x: 4, y: 0, z: 0 }, userData: {} },
      closed: { x: 0, y: 0, z: 0 },
      isOpen: true,
    },
    {
      group: {
        position: { x: 4, y: 0, z: 0 },
        userData: { partId: 'drawer-part-2' },
      },
      closed: { x: 0, y: 0, z: 0 },
      isOpen: true,
    }
  );

  captureLocalOpenStateBeforeBuild(App, { includeDrawers: true });
  App.render.doorsArray[0].isOpen = false;
  App.render.drawersArray[0].isOpen = false;
  App.render.drawersArray[1].isOpen = false;

  applyLocalOpenStateAfterBuild(App);
  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [true, false]
  );
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [true, true]
  );
  assert.equal(ensureDoorsRuntimeDefaults(App).localOpenSnapshot, null);

  closeDrawerById(App, 'drawer-part-2');
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [true, false]
  );
  assert.equal(App.render.drawersArray[1].group.position.x, 0);

  App.render.drawersArray[0].group.position.x = 5;
  closeDrawerById(App, 'drawer-1', { snap: false });
  assert.deepEqual(
    App.render.drawersArray.map((entry: any) => !!entry.isOpen),
    [false, false]
  );
  assert.equal(App.render.drawersArray[0].group.position.x, 5);
  assert.ok(renderCalls.length >= 3);
});

test('doors lifecycle preserves a global sliding track-open door across rebuilds', () => {
  const { App } = createApp({
    runtime: { doorsOpen: false, globalClickMode: true },
    config: { wardrobeType: 'sliding' },
  });

  App.render.doorsArray.push(
    { id: 'sliding_door_1', type: 'sliding', isOpen: false },
    {
      id: 'sliding_door_2',
      type: 'sliding',
      isOpen: true,
      noGlobalOpen: true,
      slidingOpenMode: 'track',
      __slidingOpenMode: 'track',
    }
  );

  captureLocalOpenStateBeforeBuild(App, { includeDrawers: true, includeSlidingTrackDoors: true });

  App.render.doorsArray = [
    { id: 'sliding_door_1', type: 'sliding', isOpen: false },
    { id: 'sliding_door_2', type: 'sliding', isOpen: false },
  ];

  applyLocalOpenStateAfterBuild(App);

  assert.equal(App.render.doorsArray[0].isOpen, false);
  assert.equal(App.render.doorsArray[1].isOpen, true);
  assert.equal(App.render.doorsArray[1].noGlobalOpen, true);
  assert.equal(App.render.doorsArray[1].slidingOpenMode, 'track');
  assert.equal(App.render.doorsArray[1].__slidingOpenMode, 'track');
  assert.equal(ensureDoorsRuntimeDefaults(App).localOpenSnapshot, null);
});
test('doors lifecycle sliding-track rebuild snapshot preserves only the track-open door when edit mode opened all sliding leaves', () => {
  const { App } = createApp({
    runtime: { doorsOpen: true, globalClickMode: true },
    config: { wardrobeType: 'sliding' },
  });

  App.render.doorsArray.push(
    {
      id: 'sliding_door_1',
      type: 'sliding',
      isOpen: true,
      noGlobalOpen: true,
      slidingOpenMode: 'track',
      __slidingOpenMode: 'track',
    },
    { id: 'sliding_door_2', type: 'sliding', isOpen: true },
    { id: 'sliding_door_3', type: 'sliding', isOpen: true }
  );

  captureLocalOpenStateBeforeBuild(App, { includeDrawers: true, includeSlidingTrackDoors: true });

  App.render.doorsArray = [
    { id: 'sliding_door_1', type: 'sliding', isOpen: false },
    { id: 'sliding_door_2', type: 'sliding', isOpen: false },
    { id: 'sliding_door_3', type: 'sliding', isOpen: false },
  ];

  applyLocalOpenStateAfterBuild(App);

  assert.deepEqual(
    App.render.doorsArray.map((entry: any) => !!entry.isOpen),
    [true, false, false]
  );
  assert.equal(App.render.doorsArray[0].noGlobalOpen, true);
  assert.equal(App.render.doorsArray[0].slidingOpenMode, 'track');
  assert.equal(App.render.doorsArray[1].noGlobalOpen, undefined);
  assert.equal(App.render.doorsArray[1].slidingOpenMode, undefined);
  assert.equal(App.render.doorsArray[2].noGlobalOpen, undefined);
  assert.equal(App.render.doorsArray[2].slidingOpenMode, undefined);
  assert.equal(ensureDoorsRuntimeDefaults(App).localOpenSnapshot, null);
});
