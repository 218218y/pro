import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCellLayoutSketchPlacementPreview } from '../esm/native/builder/render_preview_sketch_pipeline_cell_layout.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeLineSegments {
  visible = false;
  renderOrder = 0;
  material: unknown;
  geometry: unknown;
  raycast: unknown;
  userData: Record<string, unknown> = {};

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeMesh {
  visible = false;
  renderOrder = 0;
  material: unknown;
  geometry: unknown;
  raycast: unknown;
  castShadow = true;
  receiveShadow = true;
  userData: Record<string, any> = {};
  position = new FakeVector3();
  scale = new FakeVector3();
  children: unknown[] = [];

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }

  add(child: unknown) {
    this.children.push(child);
  }
}

function createContext() {
  const unitGeometry = { id: 'unit-box' };
  const outlineGeometry = { id: 'unit-outline' };
  const sourceOutline = { geometry: outlineGeometry };
  const shelfA = new FakeMesh(unitGeometry, { id: 'source' });
  shelfA.userData.__outline = sourceOutline;
  const added: FakeMesh[] = [];
  const materials = {
    selected: { id: 'selected-orange' },
    selectedRemove: { id: 'selected-red' },
    peer: { id: 'peer-cyan' },
    boundary: { id: 'boundary-black' },
  };
  const ud: Record<string, any> = {
    __cellLayoutMeshes: [],
    __matBoxOverlay: materials.selected,
    __matRemoveOverlay: materials.selectedRemove,
    __matCellLayoutPeerOverlay: materials.peer,
    __lineCellLayoutBoundaryOverlay: materials.boundary,
  };
  const boxes = [
    { x: -0.8, y: 1, z: 0, w: 0.42, boxH: 1.95, d: 0.55, selected: false },
    { x: -0.2, y: 1, z: 0, w: 0.68, boxH: 1.95, d: 0.55, selected: true },
    { x: 0.4, y: 1, z: 0, w: 0.43, boxH: 1.95, d: 0.55, selected: false },
  ];

  const ctx = {
    kind: 'cell_layout',
    input: { cellLayoutBoxes: boxes },
    THREE: { Mesh: FakeMesh, LineSegments: FakeLineSegments },
    shelfA,
    g: {
      visible: false,
      add(mesh: FakeMesh) {
        added.push(mesh);
      },
    },
    ud,
    isRemove: false,
    shared: {
      readPreviewObjectList(value: unknown) {
        return Array.isArray(value) ? value : [];
      },
      markIgnoreRaycast() {},
    },
    readOutline(mesh: FakeMesh) {
      return mesh.userData.__outline ?? null;
    },
    readValueRecord(value: unknown) {
      return value && typeof value === 'object' ? value : null;
    },
    setVisible(mesh: FakeMesh | null, visible: boolean) {
      if (!mesh) return;
      mesh.visible = visible;
      const outline = mesh.userData.__outline as FakeLineSegments | undefined;
      if (outline) outline.visible = visible;
    },
    resetMeshOrientation() {},
    applyPreviewStyle(
      mesh: FakeMesh | null,
      material: unknown,
      lineMaterial: unknown,
      renderOrder?: number,
      outlineRenderOrder?: number
    ) {
      if (!mesh) return;
      mesh.material = material;
      if (typeof renderOrder === 'number') mesh.renderOrder = renderOrder;
      const outline = mesh.userData.__outline as FakeLineSegments | undefined;
      if (outline) {
        outline.material = lineMaterial;
        if (typeof outlineRenderOrder === 'number') outline.renderOrder = outlineRenderOrder;
      }
    },
    hideAll() {},
  };

  return { ctx, boxes, added, materials, ud };
}

test('cell-layout renderer draws the selected cell separately and gives every cell a black boundary', () => {
  const { ctx, boxes, added, materials, ud } = createContext();

  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(ctx.g.visible, true);
  assert.equal(added.length, boxes.length);
  assert.equal(ud.__cellLayoutMeshes.length, boxes.length);

  for (let i = 0; i < boxes.length; i += 1) {
    const mesh = ud.__cellLayoutMeshes[i] as FakeMesh;
    const box = boxes[i]!;
    const outline = mesh.userData.__outline as FakeLineSegments;
    assert.equal(mesh.visible, true);
    assert.equal(mesh.material, box.selected ? materials.selected : materials.peer);
    assert.equal(outline.material, materials.boundary);
    assert.equal(outline.visible, true);
    assert.equal(mesh.position.x, box.x);
    assert.equal(mesh.position.y, box.y);
    assert.equal(mesh.position.z, box.z);
    assert.equal(mesh.scale.x, box.w);
    assert.equal(mesh.scale.y, box.boxH);
    assert.equal(mesh.scale.z, box.d);
    assert.equal(mesh.renderOrder, box.selected ? 10024 : 10020);
    assert.equal(outline.renderOrder, box.selected ? 10025 : 10021);
  }
});

test('cell-layout renderer reuses dynamic meshes and hides stale peer cells when the layout shrinks', () => {
  const { ctx, ud, added } = createContext();
  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(added.length, 3);

  ctx.input.cellLayoutBoxes = ctx.input.cellLayoutBoxes.slice(0, 2);
  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(added.length, 3);
  assert.equal((ud.__cellLayoutMeshes[0] as FakeMesh).visible, true);
  assert.equal((ud.__cellLayoutMeshes[1] as FakeMesh).visible, true);
  assert.equal((ud.__cellLayoutMeshes[2] as FakeMesh).visible, false);
});
