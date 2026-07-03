import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasHandleAssignClick } from '../esm/native/services/canvas_picking_handle_assign_flow.ts';
import { readManualHandlePosition } from '../esm/native/features/manual_handle_position.ts';

type AnyRecord = Record<string, unknown>;
type HandleAssignCall = { op: string; args: unknown[]; owner?: unknown };

function readRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as AnyRecord) } : {};
}

function createHandleAssignHarness(args: {
  deps?: AnyRecord;
  modeOpts?: AnyRecord;
  config?: AnyRecord;
  handleType?: string;
}): { App: any; calls: HandleAssignCall[] } {
  const calls: HandleAssignCall[] = [];
  const state = {
    ui: {},
    config: {
      handlesMap: {},
      ...(args.config || {}),
    } as AnyRecord,
    runtime: {},
    mode: { opts: args.modeOpts || {} },
    meta: {},
  };

  const App: any = {
    deps: args.deps,
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
      setConfig(patch: AnyRecord, meta?: unknown) {
        for (const [mapName, value] of Object.entries(patch || {})) {
          if (mapName === '__replace') continue;
          const prev = readRecord(state.config[mapName]);
          const next = readRecord(value);
          state.config[mapName] = next;
          App.maps[mapName] = next;

          if (mapName !== 'handlesMap') continue;
          const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
          for (const key of keys) {
            const hasNext = Object.prototype.hasOwnProperty.call(next, key);
            const nextValue = hasNext ? next[key] : null;
            if (Object.is(prev[key], nextValue)) continue;
            calls.push({ op: 'setHandle', args: [key, nextValue, meta], owner: App.store });
          }
        }
        return patch;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return args.handleType || 'standard';
        },
      },
    },
    maps: {
      getMap(name: string) {
        return state.config[name] || null;
      },
    },
  };

  App.maps.handlesMap = state.config.handlesMap;
  return { App, calls };
}

test('handle assign click reads parent-chain part ids and preserves edge variant writes through typed mode opts', () => {
  const { App, calls } = createHandleAssignHarness({
    modeOpts: { edgeHandleVariant: 'left' },
    handleType: 'edge',
  });

  const primaryHitObject = {
    userData: {},
    parent: {
      userData: { partId: 'd12_front' },
      parent: null,
    },
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject,
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].op, 'setHandle');
  assert.deepEqual(calls[0].args, ['d12_front', 'edge', { source: 'handles:assign', immediate: true }]);
  assert.equal(calls[1].op, 'setHandle');
  assert.deepEqual(calls[1].args, [
    '__wp_edge_handle_variant:d12_front',
    'short',
    { source: 'handles:assignEdgeVariant', immediate: true },
  ]);
  assert.equal(calls[0].owner, App.store);
  assert.equal(calls[1].owner, App.store);
  assert.equal(calls[2].op, 'setHandle');
  assert.deepEqual(calls[2].args, [
    '__wp_handle_color:d12_front',
    'nickel',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[2].owner, App.store);
});

test('manual handle position click stores normalized door-local position and explicit handle override', () => {
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const { App, calls } = createHandleAssignHarness({
    deps: { THREE: { Vector3 } },
    modeOpts: { handlePlacement: 'manual', handleColor: undefined },
    handleType: 'none',
  });

  const doorHitObject = {
    userData: { partId: 'd2_full', __doorWidth: 1, __doorHeight: 2 },
    worldToLocal(target: Vector3) {
      return target;
    },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: doorHitObject,
    doorHitObject,
    primaryHitPoint: { x: 0.25, y: 0.5, z: 0 },
    doorHitPoint: { x: 0.25, y: 0.5, z: 0 },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].args, ['d2_full', 'standard', { source: 'handles:assign', immediate: true }]);
  assert.deepEqual(calls[1].args, [
    '__wp_handle_color:d2_full',
    'nickel',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[2].op, 'setHandle');
  assert.equal(calls[2].args[0], '__wp_manual_handle_position:d2_full');
  assert.deepEqual(JSON.parse(String(calls[2].args[1])), { xRatio: 0.75, yRatio: 0.75 });
  assert.deepEqual(calls[2].args[2], { source: 'handles:assignManualPosition', immediate: true });
});

test('manual handle position click stores drawer-local position for external drawer fronts', () => {
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const { App, calls } = createHandleAssignHarness({
    deps: { THREE: { Vector3 } },
    modeOpts: { handlePlacement: 'manual', handleColor: 'black' },
    handleType: 'edge',
  });

  const drawerOwner = {
    userData: { partId: 'd2_draw_0', __doorWidth: 1.2, __doorHeight: 0.2 },
    worldToLocal(target: Vector3) {
      return target;
    },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: drawerOwner,
    doorHitObject: null,
    primaryHitPoint: { x: 0.3, y: 0.04, z: 0 },
    doorHitPoint: null,
    foundDrawerId: 'd2_draw_0',
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].args, ['d2_draw_0', 'edge', { source: 'handles:assign', immediate: true }]);
  assert.deepEqual(calls[1].args, [
    '__wp_edge_handle_variant:d2_draw_0',
    'short',
    { source: 'handles:assignEdgeVariant', immediate: true },
  ]);
  assert.deepEqual(calls[2].args, [
    '__wp_handle_color:d2_draw_0',
    'black',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[3].op, 'setHandle');
  assert.equal(calls[3].args[0], '__wp_manual_handle_position:d2_draw_0');
  const manualPosition = JSON.parse(String(calls[3].args[1]));
  assert.ok(Math.abs(Number(manualPosition.xRatio) - 0.75) < 1e-12);
  assert.ok(Math.abs(Number(manualPosition.yRatio) - 0.7) < 1e-12);
  assert.deepEqual(calls[3].args[2], { source: 'handles:assignManualPosition', immediate: true });
});

test('manual handle position reader accepts the canonical serialized shape only', () => {
  assert.deepEqual(readManualHandlePosition('{"xRatio":0.25,"yRatio":0.75}'), {
    xRatio: 0.25,
    yRatio: 0.75,
  });
  assert.equal(readManualHandlePosition('0.25,0.75'), null);
});

test('handle assignment treats chest drawers as drawers without targeting chest frame parts', () => {
  const { App, calls } = createHandleAssignHarness({ handleType: 'standard' });

  tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: { userData: { partId: 'chest_left' }, parent: null },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });
  assert.deepEqual(calls, []);

  tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: { userData: { partId: 'chest_drawer_0' }, parent: null },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });
  assert.equal(calls[0].op, 'setHandle');
  assert.deepEqual(calls[0].args, [
    'chest_drawer_0',
    'standard',
    { source: 'handles:assign', immediate: true },
  ]);
});

test('handle assignment targets internal drawer owner ids from drawer-box hits', () => {
  const { App, calls } = createHandleAssignHarness({
    modeOpts: { handleColor: 'black' },
    handleType: 'standard',
  });

  const internalDrawerBox = {
    userData: {
      partId: 'drawer_box__div_int_sketch_0_d1_lower',
      __wpInternalDrawerBox: true,
      __wpDrawerOwnerPartId: 'div_int_sketch_0_d1_lower',
      __doorWidth: 0.68,
      __doorHeight: 0.18,
    },
    parent: null,
  };
  const frontPanel = { userData: {}, parent: internalDrawerBox };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: frontPanel,
    foundDrawerId: 'div_int_sketch_0_d1_lower',
    effectiveDoorId: null,
    foundPartId: 'drawer_box__div_int_sketch_0_d1_lower',
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.deepEqual(calls[0].args, [
    'div_int_sketch_0_d1_lower',
    'standard',
    { source: 'handles:assign', immediate: true },
  ]);
  assert.deepEqual(calls[1].args, [
    '__wp_handle_color:div_int_sketch_0_d1_lower',
    'black',
    { source: 'handles:assignColor', immediate: true },
  ]);
});

test('normal handle assignment clears a previous manual door handle position', () => {
  const { App, calls } = createHandleAssignHarness({
    modeOpts: { handleColor: 'black' },
    handleType: 'standard',
    config: {
      handlesMap: {
        '__wp_manual_handle_position:d3_full': '{"xRatio":0.4,"yRatio":0.6}',
      },
    },
  });

  const primaryHitObject = {
    userData: { partId: 'd3_full' },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject,
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.deepEqual(calls[0].args, [
    '__wp_manual_handle_position:d3_full',
    null,
    { source: 'handles:clearManualPosition', immediate: true },
  ]);
  assert.deepEqual(calls[1].args, ['d3_full', 'standard', { source: 'handles:assign', immediate: true }]);
});
