import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCellLayoutSketchPlacementPreview,
  restoreCellLayoutWardrobeVisibility,
} from '../esm/native/builder/render_preview_sketch_pipeline_cell_layout.ts';

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
  parent: unknown = null;

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }

  add(child: any) {
    child.parent = this;
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
    divider: { id: 'door-divider-black' },
  };
  const ud: Record<string, any> = {
    __cellLayoutMeshes: [],
    __cellLayoutDoorDividerMeshes: [],
    __matCellLayoutSelectedOverlay: materials.selected,
    __matBoxOverlay: materials.selected,
    __matRemoveOverlay: materials.selectedRemove,
    __matCellLayoutPeerOverlay: materials.peer,
    __matCellLayoutDoorDividerOverlay: materials.divider,
    __lineCellLayoutBoundaryOverlay: materials.boundary,
  };
  const boxes = [
    { x: -0.8, y: 1, z: 0, w: 0.42, boxH: 1.95, d: 0.55, selected: false, doorCount: 1 },
    { x: -0.2, y: 1, z: 0, w: 0.68, boxH: 1.95, d: 0.55, selected: true, doorCount: 2 },
    { x: 0.4, y: 1, z: 0, w: 0.43, boxH: 1.95, d: 0.55, selected: false, doorCount: 2 },
  ];
  const originalVisible = { visible: true };
  const originalHidden = { visible: false };
  const g: Record<string, any> = {
    visible: false,
    isGroup: true,
    userData: ud,
    children: [],
    add(mesh: FakeMesh) {
      mesh.parent = g;
      g.children.push(mesh);
      added.push(mesh);
    },
  };
  const wardrobeRoot: Record<string, any> = {
    isGroup: true,
    children: [originalVisible, originalHidden, g],
  };
  g.parent = wardrobeRoot;

  const shared = {
    readPreviewObjectList(value: unknown) {
      return Array.isArray(value) ? value : [];
    },
    readUserData(value: unknown) {
      return value && typeof value === 'object' ? value : {};
    },
    markIgnoreRaycast() {},
  };

  const ctx = {
    App: {},
    kind: 'cell_layout',
    input: { cellLayoutBoxes: boxes, isolateWardrobe: true, isolateStackKey: null },
    THREE: { Mesh: FakeMesh, LineSegments: FakeLineSegments },
    shelfA,
    g,
    ud,
    isRemove: false,
    shared,
    wardrobeGroup() {
      return wardrobeRoot;
    },
    asPreviewGroup(value: unknown) {
      return value && typeof value === 'object' ? value : null;
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
      if (material) mesh.material = material;
      if (typeof renderOrder === 'number') mesh.renderOrder = renderOrder;
      const outline = mesh.userData.__outline as FakeLineSegments | undefined;
      if (outline) {
        if (lineMaterial) outline.material = lineMaterial;
        if (typeof outlineRenderOrder === 'number') outline.renderOrder = outlineRenderOrder;
      }
    },
    hideAll() {},
  };

  return { ctx, boxes, added, materials, ud, shared, wardrobeRoot, originalVisible, originalHidden };
}

test('cell-layout renderer isolates the original wardrobe, highlights the selected cell, and draws door separators', () => {
  const { ctx, boxes, added, materials, ud, originalVisible, originalHidden } = createContext();

  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(ctx.g.visible, true);
  assert.equal(originalVisible.visible, false);
  assert.equal(originalHidden.visible, false);
  assert.equal(ud.__cellLayoutMeshes.length, boxes.length);
  assert.equal(ud.__cellLayoutDoorDividerMeshes.length, 2);
  assert.equal(added.length, boxes.length + 2);

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

  const selectedDivider = ud.__cellLayoutDoorDividerMeshes[0] as FakeMesh;
  assert.equal(selectedDivider.visible, true);
  assert.equal(selectedDivider.material, materials.divider);
  assert.equal(selectedDivider.position.x, boxes[1]!.x);
  assert.ok(selectedDivider.position.z > boxes[1]!.z + boxes[1]!.d / 2);

  const peerDivider = ud.__cellLayoutDoorDividerMeshes[1] as FakeMesh;
  assert.equal(peerDivider.visible, true);
  assert.equal(peerDivider.position.x, boxes[2]!.x);
});

test('cell-layout isolation uses the attached THREE parent when RenderOps exposes only an add-only wardrobe adapter', () => {
  const { ctx, originalVisible, originalHidden } = createContext();
  const actualRoot = ctx.g.parent;

  ctx.wardrobeGroup = () => ({
    add(object: unknown) {
      (actualRoot as { children: unknown[] }).children.push(object);
    },
  });

  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(originalVisible.visible, false);
  assert.equal(originalHidden.visible, false);
  assert.equal(ctx.g.visible, true);
});

test('cell-layout stack isolation hides only the active stack and unscoped overlays', () => {
  const { ctx, wardrobeRoot } = createContext();
  const topPart = { visible: true, userData: { __wpStackRegion: 'top' } };
  const bottomPart = { visible: true, userData: { __wpStackRegion: 'bottom' } };
  const sharedFrame = { visible: true, userData: { __wpStackRegion: 'shared' } };
  const transientOverlay = { visible: true, userData: { partId: 'hover_overlay' } };
  const globalFreeBox = { visible: true, userData: { partId: 'sketch_box_free_42' } };
  wardrobeRoot.children.unshift(topPart, bottomPart, sharedFrame, transientOverlay, globalFreeBox);
  ctx.input.isolateStackKey = 'top';

  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(topPart.visible, false);
  assert.equal(bottomPart.visible, true);
  assert.equal(sharedFrame.visible, true);
  assert.equal(transientOverlay.visible, false);
  assert.equal(globalFreeBox.visible, true);

  restoreCellLayoutWardrobeVisibility(ctx.g as never, ctx.shared as never);
  assert.equal(topPart.visible, true);
  assert.equal(bottomPart.visible, true);
  assert.equal(sharedFrame.visible, true);
  assert.equal(transientOverlay.visible, true);
  assert.equal(globalFreeBox.visible, true);
});

test('cell-layout lower-stack isolation preserves upper and shared unified-frame geometry', () => {
  const { ctx, wardrobeRoot } = createContext();
  const topPart = { visible: true, userData: { __wpStackRegion: 'top' } };
  const bottomPart = { visible: true, userData: { __wpStackRegion: 'bottom' } };
  const sharedFrame = { visible: true, userData: { __wpStackRegion: 'shared' } };
  const transientOverlay = { visible: true, userData: { partId: 'hover_overlay' } };
  wardrobeRoot.children.unshift(topPart, bottomPart, sharedFrame, transientOverlay);
  ctx.input.isolateStackKey = 'bottom';

  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(bottomPart.visible, false);
  assert.equal(topPart.visible, true);
  assert.equal(sharedFrame.visible, true);
  assert.equal(transientOverlay.visible, false);
});

test('cell-layout isolation restores the exact pre-hover visibility state', () => {
  const { ctx, shared, originalVisible, originalHidden } = createContext();
  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);

  restoreCellLayoutWardrobeVisibility(ctx.g as never, shared as never);
  assert.equal(originalVisible.visible, true);
  assert.equal(originalHidden.visible, false);
});

test('cell-layout renderer reuses dynamic meshes and hides stale cells and door dividers when the layout shrinks', () => {
  const { ctx, ud, added } = createContext();
  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(added.length, 5);

  ctx.input.cellLayoutBoxes = ctx.input.cellLayoutBoxes.slice(0, 2);
  assert.equal(applyCellLayoutSketchPlacementPreview(ctx as never), true);
  assert.equal(added.length, 5);
  assert.equal((ud.__cellLayoutMeshes[0] as FakeMesh).visible, true);
  assert.equal((ud.__cellLayoutMeshes[1] as FakeMesh).visible, true);
  assert.equal((ud.__cellLayoutMeshes[2] as FakeMesh).visible, false);
  assert.equal((ud.__cellLayoutDoorDividerMeshes[0] as FakeMesh).visible, true);
  assert.equal((ud.__cellLayoutDoorDividerMeshes[1] as FakeMesh).visible, false);
});
