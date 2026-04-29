import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCanvasDoorSplitClick } from '../esm/native/services/canvas_picking_door_split_click.ts';
import {
  readCanvasDoorSplitBounds,
  resolveCanvasDoorSplitBaseKey,
} from '../esm/native/services/canvas_picking_door_split_click_shared.ts';

type DoorActionCall = {
  type: 'setSplit' | 'setSplitBottom' | 'setKey';
  mapName?: string;
  key: string;
  next: unknown;
  source?: unknown;
};

function createDoorGroup(partId: string, y: number, height: number) {
  return {
    group: {
      userData: { partId, __doorHeight: height },
      position: { y },
    },
  };
}

function createSplitClickApp(args: {
  splitVariant?: string;
  doorsArray: unknown[];
  maps?: Record<string, Record<string, unknown>>;
}) {
  const calls: DoorActionCall[] = [];
  const historyMeta: unknown[] = [];
  const maps: Record<string, Record<string, unknown>> = {
    splitDoorsMap: {},
    splitDoorsBottomMap: {},
    ...(args.maps || {}),
  };
  const state = {
    ui: {},
    config: {},
    runtime: {},
    mode: { opts: { splitVariant: args.splitVariant || '' } },
    meta: { version: 0, updatedAt: 0, dirty: false },
  };

  const App = {
    store: {
      getState() {
        return state;
      },
    },
    render: {
      doorsArray: args.doorsArray,
    },
    maps: {
      getMap(name: string) {
        return maps[name] || null;
      },
      setKey(mapName: string, key: string, next: unknown, meta?: { source?: unknown }) {
        if (!maps[mapName]) maps[mapName] = {};
        maps[mapName][key] = next;
        calls.push({ type: 'setKey', mapName, key, next, source: meta?.source });
      },
    },
    actions: {
      doors: {
        setSplit(key: string, next: boolean, meta?: { source?: unknown }) {
          maps.splitDoorsMap[key] = next;
          calls.push({ type: 'setSplit', key, next, source: meta?.source });
        },
        setSplitBottom(key: string, next: boolean, meta?: { source?: unknown }) {
          maps.splitDoorsBottomMap[key] = next;
          calls.push({ type: 'setSplitBottom', key, next, source: meta?.source });
        },
      },
      history: {
        batch<T>(fn: () => T, meta?: unknown): T {
          historyMeta.push(meta);
          return fn();
        },
      },
    },
  };

  return { App: App as never, calls, historyMeta, maps };
}

test('split click base normalization uses canonical lower/corner door family ids', () => {
  const { App } = createSplitClickApp({ doorsArray: [] });

  assert.equal(resolveCanvasDoorSplitBaseKey(App, 'd4_top'), 'd4');
  assert.equal(resolveCanvasDoorSplitBaseKey(App, 'corner_door_2_mid'), 'corner_door_2');
  assert.equal(resolveCanvasDoorSplitBaseKey(App, 'lower_d4_bot'), 'lower_d4');
  assert.equal(resolveCanvasDoorSplitBaseKey(App, 'lower_corner_door_2_top'), 'lower_corner_door_2');
  assert.equal(
    resolveCanvasDoorSplitBaseKey(App, 'lower_corner_pent_door_3_bot'),
    'lower_corner_pent_door_3'
  );
});

test('lower split door clicks resolve bottom split action using full-family bounds', () => {
  const { App, calls, historyMeta, maps } = createSplitClickApp({
    doorsArray: [createDoorGroup('lower_d4_bot', 0.5, 1), createDoorGroup('lower_d4_top', 1.5, 1)],
  });

  assert.deepEqual(readCanvasDoorSplitBounds(App, 'lower_d4'), { minY: 0, maxY: 2 });

  const handled = handleCanvasDoorSplitClick({
    App,
    effectiveDoorId: 'lower_d4_bot',
    foundModuleStack: 'bottom',
    doorHitY: 0.5,
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    {
      type: 'setSplitBottom',
      key: 'splitb_lower_d4',
      next: true,
      source: 'splitDoorsBottom:click',
    },
  ]);
  assert.equal(maps.splitDoorsBottomMap.splitb_lower_d4, true);
  assert.deepEqual(historyMeta, [{ source: 'splitDoorsBottom:click', immediate: true }]);
});

test('lower corner custom split commits canonical split position against full-family bounds', () => {
  const { App, calls, maps } = createSplitClickApp({
    splitVariant: 'custom',
    doorsArray: [
      createDoorGroup('lower_corner_door_2_bot', 1, 2),
      createDoorGroup('lower_corner_door_2_top', 3, 2),
    ],
  });

  assert.deepEqual(readCanvasDoorSplitBounds(App, 'lower_corner_door_2'), { minY: 0, maxY: 4 });

  const handled = handleCanvasDoorSplitClick({
    App,
    effectiveDoorId: 'lower_corner_door_2_top',
    foundModuleStack: 'top',
    doorHitY: 2.5,
  });

  assert.equal(handled, true);
  assert.deepEqual(
    calls.map(call => [call.type, call.mapName || '', call.key, call.next, call.source]),
    [
      ['setSplitBottom', '', 'splitb_lower_corner_door_2', false, 'splitDoors:custom'],
      ['setSplit', '', 'split_lower_corner_door_2', true, 'splitDoors:custom'],
      ['setKey', 'splitDoorsMap', 'splitpos_lower_corner_door_2', [0.625], 'splitDoors:custom'],
    ]
  );
  assert.deepEqual(maps.splitDoorsMap.splitpos_lower_corner_door_2, [0.625]);
});
