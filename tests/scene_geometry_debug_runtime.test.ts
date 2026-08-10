import test from 'node:test';
import assert from 'node:assert/strict';

import { createSceneGeometrySnapshot } from '../esm/native/runtime/scene_geometry_debug.ts';

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function geometry(points: number[]) {
  return {
    attributes: {
      position: {
        array: new Float32Array(points),
        itemSize: 3,
        count: Math.floor(points.length / 3),
      },
    },
    boundingBox: null as any,
    computeBoundingBox() {
      const xs: number[] = [];
      const ys: number[] = [];
      const zs: number[] = [];
      for (let index = 0; index + 2 < points.length; index += 3) {
        xs.push(points[index]!);
        ys.push(points[index + 1]!);
        zs.push(points[index + 2]!);
      }
      this.boundingBox = {
        min: vector(Math.min(...xs), Math.min(...ys), Math.min(...zs)),
        max: vector(Math.max(...xs), Math.max(...ys), Math.max(...zs)),
      };
    },
  };
}

function node(args: {
  name?: string;
  partId?: string;
  position?: ReturnType<typeof vector>;
  rotation?: ReturnType<typeof vector>;
  scale?: ReturnType<typeof vector>;
  geometry?: ReturnType<typeof geometry>;
  children?: any[];
}) {
  const out: any = {
    name: args.name || '',
    visible: true,
    parent: null,
    children: args.children || [],
    position: args.position || vector(),
    rotation: args.rotation || vector(),
    scale: args.scale || vector(1, 1, 1),
    userData: args.partId ? { partId: args.partId } : {},
    isMesh: !!args.geometry,
    geometry: args.geometry || null,
    add() {},
    remove() {},
  };
  for (const child of out.children) child.parent = out;
  return out;
}

test('scene geometry debug snapshot is deterministic across sibling ordering', () => {
  const left = node({
    partId: 'body_side_left',
    position: vector(-50, 100, 0),
    geometry: geometry([-1, 0, -2, 1, 200, 2]),
  });
  const right = node({
    partId: 'body_side_right',
    position: vector(50, 100, 0),
    geometry: geometry([-1, 0, -2, 1, 200, 2]),
  });

  const first = createSceneGeometrySnapshot(node({ name: 'wardrobe', children: [left, right] }));
  const second = createSceneGeometrySnapshot(node({ name: 'wardrobe', children: [right, left] }));

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.partIds, ['body_side_left', 'body_side_right']);
  assert.deepEqual(first.violations, []);
  assert.deepEqual(first.summary, {
    nodeCount: 3,
    visibleNodeCount: 3,
    meshCount: 2,
    geometryCount: 2,
    partNodeCount: 2,
    uniquePartCount: 2,
    vertexCount: 4,
    invalidNumberCount: 0,
    maxDepth: 1,
  });
});

test('scene geometry debug snapshot changes when geometry-relevant transforms change', () => {
  const panel = node({
    partId: 'body_top',
    position: vector(0, 200, 0),
    geometry: geometry([-50, -1, -30, 50, 1, 30]),
  });
  const root = node({ name: 'wardrobe', children: [panel] });
  const before = createSceneGeometrySnapshot(root);
  panel.position.x = 12.5;
  const after = createSceneGeometrySnapshot(root);

  assert.ok(before);
  assert.ok(after);
  assert.notEqual(before.fingerprint, after.fingerprint);
  assert.deepEqual(after.violations, []);
});

test('scene geometry debug snapshot reports non-finite transforms and vertex values', () => {
  const broken = node({
    partId: 'broken_panel',
    position: vector(Number.NaN, 0, 0),
    geometry: geometry([0, 0, 0, Number.NaN, 2, 3]),
  });
  const snapshot = createSceneGeometrySnapshot(node({ name: 'wardrobe', children: [broken] }));

  assert.ok(snapshot);
  assert.ok(snapshot.summary.invalidNumberCount >= 2);
  assert.match(snapshot.violations.join('\n'), /node:broken_panel: non-finite transform/u);
  assert.match(snapshot.violations.join('\n'), /geometry:broken_panel: 1 non-finite position values/u);
});
