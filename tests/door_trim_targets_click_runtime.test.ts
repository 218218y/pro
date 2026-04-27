import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDoorTrimTarget } from '../esm/native/services/canvas_picking_door_trim_targets.ts';
import { handleCanvasDoorTrimClick } from '../esm/native/services/canvas_picking_door_trim_click.ts';

type DoorGroupLike = {
  userData: Record<string, unknown>;
  worldToLocal?: (point: { x: number; y: number; z: number }) => unknown;
};

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createDoorGroup(partId: string, extra: Record<string, unknown> = {}): DoorGroupLike {
  return {
    userData: {
      partId,
      __doorWidth: 1,
      __doorHeight: 2,
      ...extra,
    },
    worldToLocal(point) {
      return point;
    },
  };
}

function createDoorTrimApp() {
  const historyMeta: Array<Record<string, unknown>> = [];
  const configWrites: Array<{
    mapName: string;
    nextMap: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }> = [];
  const rootState = {
    mode: {
      opts: {
        trimAxis: 'horizontal',
        trimColor: 'gold',
        trimSpan: 'half',
        trimSizeCm: 24,
        trimCrossSizeCm: 8,
      },
    },
    config: {
      doorTrimMap: {},
      mirrorLayoutMap: {},
    },
  };
  const app: any = {
    render: {},
    deps: {
      THREE: {
        Vector3: FakeVector3,
      },
    },
    store: {
      getState() {
        return rootState;
      },
    },
    actions: {
      config: {
        setMap(mapName: string, nextMap: Record<string, unknown>, meta?: Record<string, unknown>) {
          rootState.config = { ...rootState.config, [mapName]: nextMap };
          configWrites.push({ mapName, nextMap, meta });
          return nextMap;
        },
      },
      history: {
        batch(fn: () => unknown, meta?: Record<string, unknown>) {
          historyMeta.push(meta || {});
          return fn();
        },
      },
    },
  };
  return { app, rootState, historyMeta, configWrites };
}

test('door trim target resolution canonicalizes segmented door ids and bottom-corner stacks', () => {
  const segmented = createDoorGroup('d7_full');
  const lowerCorner = createDoorGroup('lower_corner_door_2_full', { __wpStack: 'bottom' });
  const App: any = {
    render: {
      doorsArray: [{ group: segmented }, { group: lowerCorner }],
    },
  };

  const segmentedTarget = resolveDoorTrimTarget(App, 'd7_top');
  assert.equal(segmentedTarget?.partId, 'd7_full');
  assert.equal(segmentedTarget?.group, segmented);

  const cornerTarget = resolveDoorTrimTarget(App, 'corner_door_2_trim', lowerCorner);
  assert.equal(cornerTarget?.partId, 'lower_corner_door_2_full');
  assert.equal(cornerTarget?.group, lowerCorner);
});

test('door trim click writes canonical trim maps through history batch and toggles existing matches off', () => {
  const { app, rootState, historyMeta, configWrites } = createDoorTrimApp();
  const doorGroup = createDoorGroup('d7_full');
  app.render.doorsArray = [{ group: doorGroup }];

  const first = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: 'd7_top',
    foundPartId: null,
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: doorGroup,
  });

  assert.equal(first, true);
  assert.equal(historyMeta.length, 1);
  assert.deepEqual(historyMeta[0], { source: 'doorTrim:click', immediate: true });
  assert.equal(configWrites.length, 1);
  assert.equal(configWrites[0]?.mapName, 'doorTrimMap');
  assert.ok(Array.isArray(rootState.config.doorTrimMap.d7_full));
  assert.equal(rootState.config.doorTrimMap.d7_full.length, 1);
  const [addedTrim] = rootState.config.doorTrimMap.d7_full;
  assert.equal(addedTrim.axis, 'horizontal');
  assert.equal(addedTrim.color, 'gold');
  assert.equal(addedTrim.span, 'half');
  assert.equal(addedTrim.sizeCm, undefined);
  assert.equal(addedTrim.crossSizeCm, 8);

  const second = handleCanvasDoorTrimClick({
    App: app,
    effectiveDoorId: 'd7_top',
    foundPartId: null,
    doorHitPoint: { x: 0, y: 0, z: 0 },
    doorHitObject: doorGroup,
  });

  assert.equal(second, true);
  assert.equal(historyMeta.length, 2);
  assert.equal(configWrites.length, 2);
  assert.deepEqual(rootState.config.doorTrimMap, {});
});
