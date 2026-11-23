import test from 'node:test';
import assert from 'node:assert/strict';
import * as Three from 'three';

import { createDoorCutHoverMarkerOwner } from '../esm/native/builder/render_preview_marker_ops_door_cut.ts';
import type { AppContainer, SketchPlacementPreviewArgsLike, ThreeLike } from '../types/index.js';
import type { Vector3Like } from '../types/three_like.js';
import {
  clearDoorArchPreview,
  showDoorArchPreview,
} from '../esm/native/services/canvas_picking_door_arch_preview.ts';
import type { ArchSurface } from '../esm/native/services/canvas_picking_door_arch_target.ts';

class Vec3 {
  x = 0;
  y = 0;
  z = 0;

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class PlaneGeometry {
  constructor(
    public width = 1,
    public height = 1
  ) {}
}

class MeshBasicMaterial {
  userData: Record<string, unknown> = {};

  constructor(public params: Record<string, unknown>) {}
}

class Mesh {
  isMesh = true;
  userData: Record<string, unknown> = {};
  visible = true;
  renderOrder = 0;
  parent: unknown = null;
  position = new Vec3();
  scale = new Vec3();
  children: Mesh[] = [];
  raycast: (...args: unknown[]) => unknown = () => undefined;

  constructor(
    public geometry: unknown,
    public material: unknown
  ) {}

  add(...children: Mesh[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }

  remove(child: Mesh) {
    this.children = this.children.filter(entry => entry !== child);
    child.parent = null;
    return this;
  }
}

const THREE = {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide: 'double-side',
};

test('door cut hover marker is a single high-contrast overlay that stays readable through transparent doors', () => {
  const App = {} as any;
  const cache = new Map<string, unknown>();
  const wardrobeGroup = {
    children: [] as Mesh[],
    add(...children: Mesh[]) {
      for (const child of children) {
        child.parent = this;
        this.children.push(child);
      }
    },
  };
  const errors: unknown[] = [];

  const owner = createDoorCutHoverMarkerOwner({
    app(args: any) {
      return args.App;
    },
    ops() {
      return {};
    },
    cacheValue(_app: unknown, key: string) {
      return cache.get(key) || null;
    },
    writeCacheValue(_app: unknown, key: string, value: unknown) {
      cache.set(key, value);
      return value;
    },
    wardrobeGroup() {
      return wardrobeGroup as any;
    },
    addToWardrobe() {
      return true;
    },
    renderOpsHandleCatch(_app: unknown, _op: string, error: unknown) {
      errors.push(error);
    },
    assertTHREE() {
      return THREE as any;
    },
  } as any);

  const marker = owner.ensureDoorCutHoverMarker({ App, THREE } as any) as Mesh | null;
  assert.ok(marker);
  assert.deepEqual(errors, []);
  assert.equal(marker.visible, false);
  assert.equal(marker.renderOrder, 10000);
  assert.equal(wardrobeGroup.children.includes(marker), true);
  assert.equal(marker.children.length, 0);
  assert.equal(marker.userData.__ignoreRaycast, true);

  const materials = [
    marker.userData.__matAdd as MeshBasicMaterial | undefined,
    marker.userData.__matRemove as MeshBasicMaterial | undefined,
    marker.userData.__matAligned as MeshBasicMaterial | undefined,
  ];
  for (const material of materials) {
    assert.ok(material);
    assert.equal(material.params.transparent, true);
    assert.equal(material.params.depthWrite, false);
    assert.equal(material.params.depthTest, false);
    assert.ok(Number(material.params.opacity) >= 0.9);
  }

  const areaAdd = marker.userData.__matAreaAdd as MeshBasicMaterial;
  const areaRemove = marker.userData.__matAreaRemove as MeshBasicMaterial;
  assert.equal(areaAdd.params.depthTest, false);
  assert.equal(areaRemove.params.depthTest, false);
  assert.ok(Number(areaAdd.params.opacity) >= 0.3 && Number(areaAdd.params.opacity) < 0.9);
  assert.ok(Number(areaRemove.params.opacity) > Number(areaAdd.params.opacity));
  assert.equal(marker.userData.__doorCutHoverVisualVersion, 3);

  const stalePrecisionLine = new Mesh(new PlaneGeometry(1, 1), null);
  marker.add(stalePrecisionLine);
  marker.userData.__precisionLine = stalePrecisionLine;
  marker.userData.__precisionMatAdd = 'stale-add';
  marker.userData.__precisionMatRemove = 'stale-remove';
  marker.userData.__precisionMatAligned = 'stale-aligned';
  marker.userData.__doorCutHoverVisualVersion = 1;
  marker.userData.__matAdd = new MeshBasicMaterial({ opacity: 0.22 });

  const cached = owner.ensureDoorCutHoverMarker({ App, THREE } as any) as Mesh | null;
  assert.equal(cached, marker);
  assert.equal(wardrobeGroup.children.filter(child => child === marker).length, 1);
  assert.equal(marker.children.includes(stalePrecisionLine), false);
  assert.equal(stalePrecisionLine.visible, false);
  assert.equal(marker.userData.__precisionLine, undefined);
  assert.equal(marker.userData.__doorCutHoverVisualVersion, 3);
  assert.ok(Number((marker.userData.__matAdd as MeshBasicMaterial).params.opacity) >= 0.9);
});

test('arched previews fill the available face and measure the crown on the door', () => {
  const runtime = Three as unknown as ThreeLike;
  const app = {} as AppContainer;
  const group = new Three.Group();
  const geometry = new Three.PlaneGeometry();
  const marker = new Three.Mesh(geometry);
  group.add(marker);
  const frame = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const anchor = group as unknown as ArchSurface['anchor'];
  const surface: ArchSurface = {
    key: 'd1_bot',
    anchor,
    group: anchor,
    rect: frame,
    z: 0,
    face: 1,
    toWorld: (point: Vector3Like) => point,
    toLocal: (point: Vector3Like) => point,
    contour: [
      { x: 0, y: 0 },
      { x: 0, y: 0.7 },
      { x: 1, y: 0.7 },
      { x: 1, y: 0 },
    ],
  };
  const slice = { surface, rect: frame, profile: { start: 0, end: 1, rise: 0.5 } };
  const measurements: SketchPlacementPreviewArgsLike[] = [];
  const record = (preview: SketchPlacementPreviewArgsLike) => measurements.push(preview);
  const areaMaterial = new Three.MeshBasicMaterial();
  marker.userData.__matAreaRemove = areaMaterial;
  assert.equal(
    showDoorArchPreview(
      marker,
      app,
      runtime,
      { kind: 'remove', tool: 'groove', slices: [slice], entries: [] },
      record
    ),
    true
  );
  assert.equal(marker.material, areaMaterial);
  marker.geometry.computeBoundingBox();
  assert.ok(Math.abs(marker.geometry.boundingBox!.max.y - 0.7) < 1e-6);
  const vertices = marker.geometry.getAttribute('position');
  let area = 0;
  for (let i = 0; i < vertices.count; i += 3) {
    const abX = vertices.getX(i + 1) - vertices.getX(i);
    const abY = vertices.getY(i + 1) - vertices.getY(i);
    const acX = vertices.getX(i + 2) - vertices.getX(i);
    const acY = vertices.getY(i + 2) - vertices.getY(i);
    area += Math.abs(abX * acY - abY * acX) / 2;
  }
  assert.ok(area > 0.65 && area < 0.7);
  assert.deepEqual(
    measurements[0]?.clearanceMeasurements?.map(entry => entry.label),
    ['30 ס"מ', '70 ס"מ']
  );

  const cut = { ...slice, rect: { ...frame, maxY: 0.6 } };
  assert.equal(
    showDoorArchPreview(marker, app, runtime, { kind: 'add', tool: 'cut', slices: [cut] }, record),
    true
  );
  assert.ok(Math.abs(Number(measurements[1]?.x) - 0.5) < 1e-8);
  assert.deepEqual(
    measurements[1]?.clearanceMeasurements?.map(entry => entry.label),
    ['40 ס"מ', '60 ס"מ']
  );
  clearDoorArchPreview(marker);
  assert.equal(marker.geometry, geometry);
  assert.equal(marker.visible, false);
});
