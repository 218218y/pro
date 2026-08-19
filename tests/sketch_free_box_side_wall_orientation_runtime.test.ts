import test from 'node:test';
import assert from 'node:assert/strict';

import { wrapNewFreePlacementObjects } from '../esm/native/builder/render_interior_sketch_boxes.ts';
import { renderSketchBoxContentDividers } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_dividers.ts';
import { resolveSketchBoxShellGeometry } from '../esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts';
import { resolveRoomWallSurface } from '../esm/native/builder/room_architecture_geometry.ts';
import { createRoomArchitecturePlanFromApp } from '../esm/native/builder/room_architecture_plan_adapter.ts';
import { resolveSketchFreePlacementBoxPreview } from '../esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts';
import { decodeSketchFreeBoxPlacementHover } from '../esm/native/services/canvas_picking_sketch_free_box_command.ts';
import {
  localizeSketchFreePlacementPreview,
  readSketchFreePlacementTransform,
} from '../esm/native/services/canvas_picking_sketch_free_box_hit.ts';
import { resolveManualLayoutSketchHoverFreePlaneContext } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_context.ts';

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, `${actual} must equal ${expected}`);
}

function createApp() {
  const state = {
    ui: { raw: { width: 240, height: 240, depth: 60 } },
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
        leftWall: { enabled: true, depthCm: 300, heightCm: 280 },
        rightWall: { enabled: true, depthCm: 300, heightCm: 280 },
        column: {
          enabled: false,
          offsetLeftCm: 180,
          widthCm: 30,
          depthCm: 20,
          heightCm: 280,
          bottomOffsetCm: 0,
        },
        openings: [],
        wallColor: '#f2efe6',
        surfacesHidden: false,
      },
    },
    runtime: { wardrobeWidthM: 2.4, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
  };
  return { store: { getState: () => state } } as any;
}

function resolveSideBox(wall: 'left' | 'right') {
  const App = createApp();
  const room = createRoomArchitecturePlanFromApp(App);
  const surface = resolveRoomWallSurface(room, wall);
  assert.ok(surface);
  const along = surface.startCoord + 1.15;
  const depth = 0.4;
  const resolved = resolveSketchBoxShellGeometry({
    box: {
      id: `side-${wall}`,
      freePlacement: true,
      placementWall: wall,
      absX: along,
      absY: 1.1,
      heightM: 1,
      widthM: 0.8,
      depthM: depth,
    } as any,
    isFreePlacement: true,
    height: 1,
    renderArgs: {
      App,
      input: { roomArchitecturePlan: room },
      effectiveBottomY: 0,
      effectiveTopY: 2.4,
      spanH: 2.4,
      innerW: 2.3,
      woodThick: 0.018,
      internalDepth: 0.56,
      internalCenterX: 0,
      internalZ: 0,
      clampY: (y: number) => y,
    } as any,
    freeWardrobeBox: {
      centerX: 0,
      centerY: 1.2,
      centerZ: 0,
      width: 2.4,
      height: 2.4,
      depth: 0.6,
    },
  });
  assert.ok(resolved);
  return { resolved, surface, along, depth };
}

for (const wall of ['left', 'right'] as const) {
  test(`free box on ${wall} wall keeps its back face on the room wall and faces inward`, () => {
    const { resolved, surface, along, depth } = resolveSideBox(wall);
    assert.equal(resolved.placementWall, wall);
    assert.equal(resolved.rotationY, wall === 'left' ? Math.PI / 2 : -Math.PI / 2);
    assert.ok(Math.abs(resolved.geometry.centerZ - along) <= 1e-9);

    const inward = wall === 'left' ? 1 : -1;
    const physicalCenterX = resolved.geometry.centerX;
    assert.ok(Math.abs(physicalCenterX - (surface.interiorFaceCoord + (inward * depth) / 2)) <= 1e-9);

    const physicalBackFaceX = physicalCenterX - (inward * depth) / 2;
    assert.ok(Math.abs(physicalBackFaceX - surface.interiorFaceCoord) <= 1e-9);
    const physicalFrontFaceX = physicalCenterX + (inward * depth) / 2;
    assert.ok((physicalFrontFaceX - physicalBackFaceX) * inward > 0);
  });
}

test('side-wall free-box preview rotates into the room and persists the host wall in the command', () => {
  const placementSurface = {
    wall: 'right' as const,
    axis: 'z' as const,
    startCoord: -0.31,
    usableLength: 3,
    wallHeight: 2.8,
    interiorFaceCoord: 2.3,
    inwardNormalX: -1 as const,
    inwardNormalZ: 0 as const,
  };
  const preview = resolveSketchFreePlacementBoxPreview({
    App: {} as any,
    tool: 'sketch_box_free',
    host: { moduleKey: 2, isBottom: false },
    planeHit: { x: 0.8, y: 1.1, z: 0 },
    wardrobeBox: { centerX: 1.19, centerY: 1.4, centerZ: 0, width: 3, height: 2.8, depth: 0.6 },
    wardrobeBackZ: 0,
    freeBoxes: [],
    intersects: [],
    localParent: null,
    placementWall: 'right',
    placementSurface,
    resolveSketchFreeBoxHoverPlacement: () => ({
      op: 'add',
      previewX: 0.8,
      previewY: 1.1,
      previewH: 1,
      previewW: 0.8,
      previewD: 0.4,
      snapToCenter: false,
      removeId: null,
      placementWall: 'right',
    }),
    resolveSketchFreeBoxGeometry: (() => {
      throw new Error('not used for side add preview');
    }) as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    boxH: 1,
    widthOverrideM: 0.8,
    depthOverrideM: 0.4,
  });
  assert.ok(preview);
  assert.ok(Math.abs(Number(preview.preview.x) - 2.1) <= 1e-9);
  assert.ok(Math.abs(Number(preview.preview.z) - 0.8) <= 1e-9);
  assert.equal(preview.preview.rotationY, -Math.PI / 2);
  assert.equal(preview.preview.fillFront, false);

  const decoded = decodeSketchFreeBoxPlacementHover(preview.hoverRecord);
  assert.equal(decoded.ok, true);
  if (!decoded.ok || decoded.value.kind !== 'create-free-box')
    assert.fail('expected create-free-box command');
  assert.equal(decoded.value.geometry.placementWall, 'right');
});

test('side-wall free-box contents inherit wall orientation from a parent frame without consuming door motion rotation', () => {
  class FakeGroup {
    name = '';
    parent: FakeGroup | null = null;
    children: FakeGroup[] = [];
    userData: Record<string, unknown> = {};
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => Object.assign(this.position, { x, y, z }),
    };
    rotation = { x: 0, y: 0, z: 0 };
    add(child: FakeGroup) {
      child.parent?.remove(child);
      child.parent = this;
      this.children.push(child);
    }
    remove(child: FakeGroup) {
      this.children = this.children.filter(entry => entry !== child);
      if (child.parent === this) child.parent = null;
    }
    updateMatrixWorld() {}
  }

  const root = new FakeGroup();
  const door = new FakeGroup();
  door.name = 'door';
  door.position.set(1.82, 1.1, 1.01);
  door.rotation.y = 0.37;
  const divider = new FakeGroup();
  divider.name = 'divider';
  divider.position.set(2.24, 1.1, 0.86);
  const drawer = new FakeGroup();
  drawer.name = 'drawer';
  drawer.position.set(2.12, 0.7, 0.81);
  root.add(door);
  root.add(divider);
  root.add(drawer);

  const drawerMotion = {
    group: drawer,
    closed: { x: 2.12, y: 0.7, z: 0.81 },
    open: { x: 2.12, y: 0.7, z: 1.16 },
  };
  const App = { render: { drawersArray: [drawerMotion] } } as any;

  wrapNewFreePlacementObjects({
    renderArgs: {
      App,
      group: root,
      THREE: { Group: FakeGroup },
      drawersArray: [drawerMotion],
      renderOpsHandleCatch: () => {},
    } as any,
    startIndex: 0,
    state: {
      box: { absX: 0.8 },
      boxId: 'side-right',
      boxPid: 'sketch_box_free_0_side-right',
      isFreePlacement: true,
      placementWall: 'right',
      rotationY: -Math.PI / 2,
      geometry: { centerX: 2.1, centerZ: 0.8, outerD: 0.4 },
    } as any,
  });

  assert.equal(root.children.length, 1);
  const frame = root.children[0];
  assert.equal(frame.name, 'wpSketchFreePlacementFrame_sketch_box_free_0_side-right');
  assertClose(frame.position.x, 2.1);
  assertClose(frame.position.z, 0.8);
  assertClose(frame.rotation.y, -Math.PI / 2);
  assert.equal(door.parent, frame);
  assert.equal(divider.parent, frame);
  assert.equal(drawer.parent, frame);
  assertClose(door.position.x, -0.28);
  assertClose(door.position.z, 0.21);
  assertClose(door.rotation.y, 0.37);
  assertClose(drawer.position.x, 0.02);
  assertClose(drawer.position.z, 0.01);
  assertClose(drawerMotion.closed.x, 0.02);
  assertClose(drawerMotion.closed.z, 0.01);
  assertClose(drawerMotion.open.x, 0.02);
  assertClose(drawerMotion.open.z, 0.36);

  door.rotation.y = 0;
  assertClose(frame.rotation.y, -Math.PI / 2);
  door.rotation.y = -1.2;
  assertClose(frame.rotation.y, -Math.PI / 2);

  const transform = readSketchFreePlacementTransform(door);
  assert.ok(transform);
  assert.equal(transform.owner, frame);
  assert.equal(transform.wall, 'right');
});

test('side-wall persisted divider front depth is translated into the pre-wrap builder frame', () => {
  const emitted: unknown[][] = [];
  renderSketchBoxContentDividers({
    shell: {
      boxPid: 'sketch_box_free_0_side-right',
      centerY: 1.1,
      sideH: 0.964,
      boxMat: {},
      isFreePlacement: true,
      placementWall: 'right',
      geometry: {
        centerX: 2.1,
        centerZ: 0.8,
        outerW: 0.8,
        innerW: 0.764,
        outerD: 0.4,
        innerBackZ: 0.618,
        innerD: 0.382,
      },
    } as any,
    boxDividers: [],
    boxHorizontalDividers: [{ id: 'h1', yNorm: 0.5, centered: true, frontZ: 0.4 }],
    args: {
      createBoard: (...values: unknown[]) => {
        emitted.push(values);
        return {};
      },
      woodThick: 0.018,
      getPartMaterial: null,
      isFn: (value: unknown) => typeof value === 'function',
    } as any,
  } as any);

  assert.equal(emitted.length, 1);
  // canonical frontZ=0.4 becomes physical frontZ=1.0 before the wrapper;
  // centerZ = 1.0 - 0.382/2 = 0.809. After wrapping around pivotZ=0.8
  // this lands at local Z=0.009, exactly matching the hover preview.
  assertClose(Number(emitted[0][5]), 0.809);
});

test('hover context keeps the directly hit back-wall free box when a side-wall box is farther on the ray', () => {
  const backBox = {
    id: 'back-box',
    freePlacement: true,
    placementWall: 'back',
    absX: 0.2,
    absY: 1,
    heightM: 1,
    widthM: 0.8,
    depthM: 0.4,
  };
  const sideBox = {
    id: 'side-box',
    freePlacement: true,
    placementWall: 'right',
    absX: 0.8,
    absY: 1,
    heightM: 1,
    widthM: 0.8,
    depthM: 0.4,
  };
  const context = resolveManualLayoutSketchHoverFreePlaneContext({
    App: {} as any,
    ndcX: 0,
    ndcY: 0,
    camera: null,
    wardrobeGroup: null,
    raycaster: { setFromCamera() {} },
    mouse: { x: 0, y: 0 },
    intersects: [
      {
        object: { userData: { partId: 'sketch_box_free_0_back-box_side_left' } },
        point: { x: 0, y: 1, z: 0 },
      },
      {
        object: {
          userData: { partId: 'sketch_box_free_0_side-box_side_left' },
          parent: {
            userData: {
              __wpSketchFreePlacementWall: 'right',
              __wpSketchFreePlacementRotationY: -Math.PI / 2,
              __wpSketchFreePlacementPivotX: 2.1,
              __wpSketchFreePlacementPivotZ: 0.8,
              __wpSketchFreePlacementAlong: 0.8,
              __wpSketchFreePlacementLogicalCenterZ: 0.2,
            },
          },
        },
        point: { x: 2.1, y: 1, z: 0.8 },
      },
    ] as any,
    __wp_parseSketchBoxToolSpec: () => null,
    __wp_pickSketchFreeBoxHost: () => ({ moduleKey: 0, isBottom: false }),
    __wp_measureWardrobeLocalBox: () => ({
      centerX: 0,
      centerY: 1.2,
      centerZ: 0,
      width: 2.4,
      height: 2.4,
      depth: 0.6,
    }),
    __wp_intersectScreenWithLocalZPlane: () => ({ x: 0.2, y: 1, z: -0.3 }),
    __wp_readInteriorModuleConfigRef: () => ({ sketchExtras: { boxes: [sideBox, backBox] } }),
    tool: 'sketch_box_divider',
  } as any);

  assert.ok(context);
  assert.equal(context.placementWall, 'back');
  assert.equal(context.placementTransform, null);
  assert.deepEqual(
    context.freeBoxes.map(box => box.id),
    ['back-box']
  );
});

test('side-wall content preview localizes box, front overlay and measurement coordinates into the same parent frame', () => {
  const owner = { add() {} };
  const transform = {
    wall: 'right' as const,
    rotationY: -Math.PI / 2,
    pivotX: 2.1,
    pivotZ: 0.8,
    along: 0.8,
    logicalCenterZ: 0.2,
    owner,
  };
  const localized = localizeSketchFreePlacementPreview(
    {
      kind: 'drawers',
      x: 0.95,
      z: 0.38,
      frontOverlayX: 1.1,
      frontOverlayZ: 0.4,
      clearanceMeasurements: [{ startX: 0.8, endX: 1.2, labelX: 1, startY: 0.4, endY: 0.8, z: 0.45 }],
    },
    transform
  );

  assertClose(Number(localized.x), 0.15);
  assertClose(Number(localized.z), 0.18);
  assertClose(Number(localized.frontOverlayX), 0.3);
  assertClose(Number(localized.frontOverlayZ), 0.2);
  const measurement = (localized.clearanceMeasurements as Array<Record<string, number>>)[0];
  assertClose(measurement.startX, 0);
  assertClose(measurement.endX, 0.4);
  assertClose(measurement.labelX, 0.2);
  assertClose(measurement.z, 0.25);
});
