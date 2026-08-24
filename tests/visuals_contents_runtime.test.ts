import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addHangingClothes,
  addFoldedClothes,
  addRealisticHanger,
} from '../esm/native/builder/visuals_contents.ts';
import {
  getCachedBoxGeometry,
  getCachedExtrudeGeometry,
  getCachedRoundedBoxGeometry,
  getVisualContentGeometryCachePerfStats,
  resetVisualContentGeometryCachePerfStats,
  resolveContentsOutline,
  resolveContentsDoorStyle,
  requireContentsRenderPolicy,
  resolveLibraryContents,
  resolveShowContents,
  resolveShowHanger,
} from '../esm/native/builder/visuals_contents_shared.ts';
import { __asBufferAttribute } from '../esm/native/builder/visuals_and_contents_shared.ts';
import { BOOK_CONTENT_VISUAL_POLICY } from '../esm/shared/dimensions/content_visual_policy.ts';
import { createRoomArchitecturePlan } from '../esm/native/builder/room_architecture_geometry.ts';
import { createRoomArchitecturePlanFromApp } from '../esm/native/builder/room_architecture_plan_adapter.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeScale {
  x = 1;
  y = 1;
  z = 1;
  set(x = 1, y = 1, z = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  children: any[] = [];
  position = new FakeVector3();
  rotation = new FakeVector3();
  scale = new FakeScale();
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  geometry: any;
  material: any;
  constructor(geometry: any, material: any) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeBoxGeometry {
  type = 'BoxGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeTorusGeometry {
  type = 'TorusGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeCylinderGeometry {
  type = 'CylinderGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeExtrudeGeometry {
  type = 'ExtrudeGeometry';
  shape: any;
  opts: Record<string, unknown>;
  constructor(shape: any, opts: Record<string, unknown>) {
    this.shape = shape;
    this.opts = opts;
  }
}
class FakeShape {
  cmds: any[] = [];
  moveTo(...args: number[]) {
    this.cmds.push(['moveTo', ...args]);
  }
  quadraticCurveTo(...args: number[]) {
    this.cmds.push(['quadraticCurveTo', ...args]);
  }
  lineTo(...args: number[]) {
    this.cmds.push(['lineTo', ...args]);
  }
}
class FakeMeshStandardMaterial {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

class FakeBox3 {
  min = new FakeVector3();
  max = new FakeVector3();
  setFromObject(obj: any) {
    const kind = String(obj?.userData?.__kind || '');
    const halfX = kind === 'single_hanger_group' ? 0.24 : kind === 'hanging_hanger' ? 0.012 : 0.01;
    const halfY = kind === 'single_hanger_group' ? 0.2 : kind === 'hanging_hanger' ? 0.035 : 0.01;
    const halfZ = kind === 'single_hanger_group' ? 0.035 : 0.02;
    const x = Number(obj?.position?.x || 0);
    const y = Number(obj?.position?.y || 0);
    const z = Number(obj?.position?.z || 0);
    this.min.set(x - halfX, y - halfY, z - halfZ);
    this.max.set(x + halfX, y + halfY, z + halfZ);
    return this;
  }
}

function resolveShelfItemBoundsXY(item: any) {
  const [width, height] = item.geometry.args;
  if (item.userData.__kind === 'library_book') {
    const angleZ = Math.abs(Number(item.rotation?.z || 0));
    const angleCos = Math.abs(Math.cos(angleZ));
    const angleSin = Math.abs(Math.sin(angleZ));
    const halfWidth = (width * angleCos + height * angleSin) / 2;
    const halfHeight = (height * angleCos + width * angleSin) / 2;
    return {
      minX: item.position.x - halfWidth,
      maxX: item.position.x + halfWidth,
      minY: item.position.y - halfHeight,
      maxY: item.position.y + halfHeight,
    };
  }

  return {
    minX: item.position.x - width / 2,
    maxX: item.position.x + width / 2,
    minY: item.position.y - height / 2,
    maxY: item.position.y + height / 2,
  };
}

function createApp(overrides: Record<string, unknown> = {}) {
  const outlined: unknown[] = [];
  const buildUI = {
    showContents: true,
    showHanger: true,
    doorStyle: 'flat',
    ...(overrides.buildUI as object),
  };
  const state = {
    ui: overrides.ui || {},
    runtime: overrides.runtime || {},
    config: overrides.config || {},
    mode: {},
    meta: {},
  };
  const App: any = {
    services: {
      builder: {
        modules: {},
        contents: {},
        renderOps: {
          addOutlines(mesh: unknown) {
            outlined.push(mesh);
          },
        },
      },
      platform: {
        getBuildUI() {
          return buildUI;
        },
      },
    },
    deps: {
      THREE: {
        Group: FakeGroup,
        Mesh: FakeMesh,
        BoxGeometry: FakeBoxGeometry,
        TorusGeometry: FakeTorusGeometry,
        CylinderGeometry: FakeCylinderGeometry,
        ExtrudeGeometry: FakeExtrudeGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        Shape: FakeShape,
        Box3: FakeBox3,
      },
    },
    store: {
      getState() {
        return state;
      },
    },
  };
  return { App, outlined };
}

const defaultRoomArchitecturePlan = createRoomArchitecturePlan({
  config: {
    backWall: { enabled: false, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
    leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
    rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
    column: { enabled: false, offsetLeftCm: 180, widthCm: 30, depthCm: 20, heightCm: 280, bottomOffsetCm: 0 },
    openings: [],
    wallColor: '#f2efe6',
    surfacesHidden: false,
  },
  wardrobeWidthM: 2.4,
  wardrobeHeightM: 2.4,
  wardrobeDepthM: 0.6,
});

function foldedContentsPolicy(
  isLibraryMode: boolean,
  showContentsEnabled = true,
  sketchMode = false,
  addOutlines: ((mesh: unknown) => unknown) | null = null
) {
  return { showContentsEnabled, sketchMode, addOutlines, cfgSnapshot: { isLibraryMode } };
}

function hangingContentsPolicy(
  doorStyle: string,
  showContentsEnabled = true,
  sketchMode = false,
  addOutlines: ((mesh: unknown) => unknown) | null = null,
  roomArchitecturePlan = defaultRoomArchitecturePlan
) {
  return { showContentsEnabled, doorStyle, sketchMode, addOutlines, roomArchitecturePlan };
}

function hangerContentsPolicy(
  showHangerEnabled: boolean,
  sketchMode = false,
  addOutlines: ((mesh: unknown) => unknown) | null = null,
  roomArchitecturePlan = defaultRoomArchitecturePlan
) {
  return { showHangerEnabled, sketchMode, addOutlines, roomArchitecturePlan };
}

test('visuals_contents library policy requires and reads only the explicit config snapshot', () => {
  assert.equal(resolveLibraryContents(foldedContentsPolicy(true)), true);
  assert.equal(resolveLibraryContents(foldedContentsPolicy(false)), false);
  assert.throws(
    () => resolveLibraryContents(undefined as never),
    /\[visuals_contents\] showContentsEnabled policy is required/
  );
});

test('visuals_contents visibility and door-style policy are explicit and fail fast', () => {
  assert.equal(resolveShowContents(foldedContentsPolicy(false, true)), true);
  assert.equal(resolveShowContents(foldedContentsPolicy(false, false)), false);
  assert.equal(resolveContentsDoorStyle(hangingContentsPolicy('profile')), 'profile');
  assert.throws(
    () => resolveShowContents({} as never),
    /\[visuals_contents\] showContentsEnabled policy is required/
  );
  assert.throws(
    () => resolveContentsDoorStyle({ showContentsEnabled: true } as never),
    /\[visuals_contents\] doorStyle policy is required/
  );
});

test('visuals_contents hanger policy requires and reads only the explicit build flag', () => {
  assert.equal(resolveShowHanger(hangerContentsPolicy(true)), true);
  assert.equal(resolveShowHanger(hangerContentsPolicy(false)), false);
  assert.throws(
    () => resolveShowHanger(undefined as never),
    /\[visuals_contents\] showHangerEnabled is required/
  );
});

test('visuals_contents render policy requires explicit sketch mode and outline callback state', () => {
  const addOutlines = () => undefined;
  assert.deepEqual(requireContentsRenderPolicy({ sketchMode: false, addOutlines: null }), {
    sketchMode: false,
    addOutlines: null,
  });
  assert.equal(resolveContentsOutline({ sketchMode: true, addOutlines }), addOutlines);
  assert.equal(resolveContentsOutline({ sketchMode: false, addOutlines }), null);
  assert.throws(
    () => requireContentsRenderPolicy({ addOutlines: null } as never),
    /\[visuals_contents\] sketchMode policy is required/
  );
  assert.throws(
    () => requireContentsRenderPolicy({ sketchMode: true } as never),
    /\[visuals_contents\] addOutlines policy must be a function or null/
  );
});

test('visuals_and_contents buffer attribute reader does not coerce runtime geometry strings', () => {
  const numericAttr = __asBufferAttribute({
    count: 1,
    getX() {
      return 0.42;
    },
    setZ() {},
  });
  assert.equal(numericAttr?.getX(0), 0.42);

  const stringAttr = __asBufferAttribute({
    count: 1,
    getX() {
      return '0.42';
    },
    setZ() {},
  });
  assert.ok(Number.isNaN(stringAttr?.getX(0)));
});

test('visuals_contents hanging clothes honor showContents, style depth, and outline only cloth meshes', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true, doorStyle: 'profile' } });
  const parent = new FakeGroup();

  addHangingClothes(
    App,
    0,
    1.4,
    0,
    0.16,
    parent as any,
    1.3,
    0.2,
    hangingContentsPolicy('profile', true, true, mesh => outlined.push(mesh))
  );

  const hangers = parent.children.filter(child => child.userData.__kind === 'hanging_hanger');
  const clothes = parent.children.filter(child => child.userData.__kind === 'hanging_cloth');

  assert.equal(hangers.length, 4);
  assert.equal(clothes.length, 4);
  assert.equal(outlined.length, 4);
  assert.ok(clothes.every(child => child.geometry.type === 'ExtrudeGeometry'));
  assert.ok(clothes.every(child => child.geometry.opts.depth === 0.2));
  assert.ok(clothes.every(child => typeof child.rotation.y === 'number'));
  assert.ok(
    hangers.every(child =>
      child.children.some((detail: any) => detail.userData.__kind === 'hanging_hanger_shoulder')
    )
  );
  assert.ok(
    clothes.every(child =>
      child.children.some((detail: any) => String(detail.userData.__kind || '').startsWith('hanging_cloth_'))
    )
  );
});

test('visuals_contents explicit visibility policy overrides contradictory live build UI', () => {
  const { App } = createApp({ buildUI: { showContents: true, doorStyle: 'profile' } });
  const hangingParent = new FakeGroup();
  const foldedParent = new FakeGroup();

  addHangingClothes(
    App,
    0,
    1.4,
    0,
    0.4,
    hangingParent as any,
    1.3,
    0.2,
    hangingContentsPolicy('profile', false)
  );
  addFoldedClothes(App, 0, 0.2, 0, 0.6, foldedParent as any, 0.25, 0.2, foldedContentsPolicy(true, false));

  assert.equal(hangingParent.children.length, 0);
  assert.equal(foldedParent.children.length, 0);
});

test('visuals_contents folded clothes clamp depth and use only the explicit sketch policy', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true }, runtime: { sketchMode: false } });
  const parent = new FakeGroup();

  addFoldedClothes(
    App,
    0,
    0.2,
    0,
    0.6,
    parent as any,
    0.25,
    0.2,
    foldedContentsPolicy(false, true, true, mesh => outlined.push(mesh))
  );

  assert.ok(parent.children.length > 0);
  assert.equal(outlined.length, parent.children.length);

  const garments = parent.children;
  const bodies = garments.map(garment =>
    garment.children.find((child: any) => child.userData.__kind === 'folded_cloth_body')
  );
  assert.ok(bodies.every(Boolean), 'each folded garment group should own one body mesh');
  assert.ok(
    bodies.every(body => outlined.includes(body)),
    'outlines should remain attached to body meshes'
  );

  const minShelfZ = -0.1 + 0.015;
  const maxShelfZ = 0.1 - 0.015;
  const readEffectiveDepth = (child: any) => child.geometry.args[2] * child.scale.z;
  assert.ok(
    garments.every(
      (garment, index) => garment.position.z - readEffectiveDepth(bodies[index]) / 2 >= minShelfZ - 1e-9
    )
  );
  assert.ok(
    garments.every(
      (garment, index) => garment.position.z + readEffectiveDepth(bodies[index]) / 2 <= maxShelfZ + 1e-9
    )
  );
  assert.equal(
    new Set(bodies.map(body => body.geometry)).size,
    1,
    'folded bodies should share one canonical geometry'
  );
  assert.ok(
    new Set(bodies.map(body => body.scale.x)).size > 1,
    'decorative width variation should be preserved on mesh scale'
  );
  assert.ok(
    bodies.every(body => Math.abs(body.geometry.args[1] * body.scale.y - 0.025) < 1e-9),
    'canonical scaling must preserve the requested garment height'
  );
  assert.ok(garments.every(garment => garment.userData.__kind === 'folded_cloth_item'));
  assert.ok(
    garments.every(garment => garment.scale.x === 1 && garment.scale.y === 1 && garment.scale.z === 1),
    'folded garment roots must remain unscaled'
  );
  assert.ok(
    garments.some(garment =>
      garment.children.some(
        (detail: any) =>
          detail.userData.__kind !== 'folded_cloth_body' &&
          String(detail.userData.__kind || '').startsWith('folded_cloth_')
      )
    )
  );
  assert.ok(
    bodies.every(body =>
      body.children.every((child: any) => !String(child.userData.__kind || '').startsWith('folded_cloth_'))
    ),
    'folded details must be siblings of the scaled body rather than scaled descendants'
  );
});

test('visuals_contents folded shelf runtime dimensions reject numeric strings', () => {
  const { App } = createApp({ buildUI: { showContents: true } });
  const foldedParent = new FakeGroup();
  const libraryParent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.6, foldedParent as any, '0.25' as any, 0.2, foldedContentsPolicy(false));
  assert.equal(foldedParent.children.length, 0, 'folded runtime maxHeight string should not render');

  addFoldedClothes(App, 0, 0.2, 0, 0.6, libraryParent as any, '0.25' as any, 0.2, foldedContentsPolicy(true));
  assert.equal(libraryParent.children.length, 0, 'library shelf runtime maxHeight string should not render');
});

test('visuals_contents folded shelf renders books instead of clothes in library mode', () => {
  const { App, outlined } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: false },
    runtime: { sketchMode: true },
  });
  const parent = new FakeGroup();

  addFoldedClothes(
    App,
    0,
    0.2,
    0,
    0.6,
    parent as any,
    0.25,
    0.2,
    foldedContentsPolicy(true, true, true, mesh => outlined.push(mesh))
  );

  assert.ok(parent.children.length > 0);
  assert.equal(outlined.length, parent.children.length);
  assert.ok(
    parent.children.every(child => child.userData.__kind === 'library_book'),
    'library contents should render only upright books, not folded-clothes meshes or horizontal stacks'
  );
  assert.ok(parent.children.every(child => child.geometry?.type === 'BoxGeometry'));
});

test('visuals_contents library books render as aligned holy-book sets instead of fully random volumes', () => {
  const { App } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
  });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 1.2, parent as any, 0.34, 0.24, foldedContentsPolicy(true));

  const uprightBooks = parent.children.filter(child => child.userData.__kind === 'library_book');
  assert.ok(
    uprightBooks.length >= 12,
    'wide library shelves should render enough upright books to reveal sets'
  );

  const heights = uprightBooks.map(child => Number(child.geometry.args[1])).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)];
  const alignedCount = heights.filter(height => Math.abs(height - medianHeight) <= 0.045).length;
  assert.ok(
    alignedCount >= Math.floor(heights.length * 0.7),
    'most books on the same shelf should stay in a close height band'
  );

  let longestSameColorRun = 1;
  let currentRun = 1;
  for (let i = 1; i < uprightBooks.length; i += 1) {
    const prevColor = uprightBooks[i - 1].material?.opts?.color;
    const color = uprightBooks[i].material?.opts?.color;
    if (color === prevColor) {
      currentRun += 1;
      longestSameColorRun = Math.max(longestSameColorRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  assert.ok(longestSameColorRun >= 4, 'library shelves should include visible repeated-color book sets');
  assert.ok(
    uprightBooks.some(book =>
      book.children.some((child: any) => child.userData.__kind === 'library_book_spine_band')
    ),
    'some books should include spine bands so holy-book sets do not look like plain random blocks'
  );
});

test('visuals_contents library books avoid tiny decorative slabs and keep depth variation orderly', () => {
  const { App } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
  });
  const parent = new FakeGroup();
  const shelfZ = 0;
  const maxDepth = 0.55;

  addFoldedClothes(App, 0, 0.2, shelfZ, 1.1, parent as any, 0.42, maxDepth, foldedContentsPolicy(true));

  const dims = BOOK_CONTENT_VISUAL_POLICY;
  const books = parent.children.filter(child => child.userData.__kind === 'library_book');
  const stacks = parent.children.filter(child => child.userData.__kind === 'library_book_stack');
  assert.ok(books.length > 0, 'library mode should render upright books');
  assert.equal(stacks.length, 0, 'library mode should no longer render horizontal stacked books');

  const bookDepths = books.map(child => Number(child.geometry.args[2]));
  const roundedDepths = new Set(bookDepths.map(depth => depth.toFixed(3)));
  assert.ok(roundedDepths.size > 1, 'upright books should have slight depth variation');
  assert.ok(
    Math.max(...bookDepths) > 0.2,
    'deep shelves should no longer cap library books at the old shallow 20cm depth'
  );
  assert.ok(
    bookDepths.every(depth => depth >= dims.depthMaxM - dims.depthRandomTrimRangeM - 1e-9),
    'depth variation should stay close enough that the shelf still looks ordered'
  );
  const expectedBackZ = shelfZ - maxDepth / 2 + dims.depthMarginM;
  assert.ok(
    parent.children.every(
      child => Math.abs(child.position.z - child.geometry.args[2] / 2 - expectedBackZ) <= 1e-9
    ),
    'random book depths should stay back-aligned instead of drifting randomly through the shelf'
  );
});

test('visuals_contents library books keep tight packing without mesh collisions', () => {
  const { App } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
  });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 1.1, parent as any, 0.42, 0.55, foldedContentsPolicy(true));

  const shelfItems = parent.children.filter(child => child.userData.__kind === 'library_book');
  assert.ok(shelfItems.length > 0, 'library mode should render shelf book visuals');

  const maxPenetrationM = 0.0002;
  for (let i = 0; i < shelfItems.length; i += 1) {
    const a = resolveShelfItemBoundsXY(shelfItems[i]);
    for (let j = i + 1; j < shelfItems.length; j += 1) {
      const b = resolveShelfItemBoundsXY(shelfItems[j]);
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      assert.ok(
        overlapX <= maxPenetrationM || overlapY <= maxPenetrationM,
        `library shelf items should not occupy the same space (pair ${i}-${j}, overlapX=${overlapX}, overlapY=${overlapY})`
      );
    }
  }
});

test('visuals_contents library books fit small shelf clearance and disappear when too tight', () => {
  const { App } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
  });
  const parent = new FakeGroup();
  const shelfY = 0.2;
  const maxHeight = 0.1;

  addFoldedClothes(App, 0, shelfY, 0, 0.6, parent as any, maxHeight, 0.2, foldedContentsPolicy(true));

  assert.ok(parent.children.length > 0);
  for (const child of parent.children) {
    const [bookWidth, bookHeight] = child.geometry.args;
    const angleZ = Number(child.rotation?.z || 0);
    const rotatedHeight =
      child.userData.__kind === 'library_book'
        ? Math.abs(bookHeight * Math.cos(angleZ)) + Math.abs(bookWidth * Math.sin(angleZ))
        : bookHeight;
    assert.ok(child.position.y + rotatedHeight / 2 <= shelfY + maxHeight - 0.014 + 1e-9);
  }

  const tinyParent = new FakeGroup();
  addFoldedClothes(App, 0, shelfY, 0, 0.6, tinyParent as any, 0.075, 0.2, foldedContentsPolicy(true));
  assert.equal(tinyParent.children.length, 0);
});

test('visuals_contents reuse content geometries and materials across deterministic rebuilds', () => {
  const { App } = createApp({
    buildUI: { showContents: true, doorStyle: 'profile' },
    config: { isLibraryMode: true },
  });
  const firstShelf = new FakeGroup();
  const secondShelf = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.8, firstShelf as any, 0.28, 0.22, foldedContentsPolicy(true));
  addFoldedClothes(App, 0, 0.2, 0, 0.8, secondShelf as any, 0.28, 0.22, foldedContentsPolicy(true));

  assert.ok(firstShelf.children.length > 0);
  assert.equal(firstShelf.children.length, secondShelf.children.length);
  assert.equal(firstShelf.children[0].geometry, secondShelf.children[0].geometry);
  assert.equal(firstShelf.children[0].material, secondShelf.children[0].material);
  assert.equal(firstShelf.children[0].geometry.userData.__sharedVisualContentGeometry, true);
  assert.equal(firstShelf.children[0].material.userData.__sharedVisualContentMaterial, true);

  const firstRod = new FakeGroup();
  const secondRod = new FakeGroup();
  addHangingClothes(App, 0, 1.4, 0, 0.16, firstRod as any, 1.3, 0.2, hangingContentsPolicy('profile'));
  addHangingClothes(App, 0, 1.4, 0, 0.16, secondRod as any, 1.3, 0.2, hangingContentsPolicy('profile'));
  const firstCloth = firstRod.children.find(child => child.userData.__kind === 'hanging_cloth');
  const secondCloth = secondRod.children.find(child => child.userData.__kind === 'hanging_cloth');

  assert.ok(firstCloth);
  assert.ok(secondCloth);
  assert.equal(firstCloth.geometry, secondCloth.geometry);
  assert.equal(firstCloth.material, secondCloth.material);
  assert.equal(firstCloth.geometry.userData.__sharedVisualContentGeometry, true);
  assert.equal(firstCloth.material.userData.__sharedVisualContentMaterial, true);
});

test('visuals_contents geometry cache absorbs sub-millimeter decorative jitter', () => {
  const { App } = createApp();
  const THREE = App.deps.THREE;
  THREE.RoundedBoxGeometry = FakeBoxGeometry;

  const firstBox = getCachedBoxGeometry(THREE, 0.1234, 0.2507, 0.1709);
  const secondBox = getCachedBoxGeometry(THREE, 0.1239, 0.2509, 0.17095);
  assert.equal(firstBox, secondBox);

  const firstRounded = getCachedRoundedBoxGeometry(THREE, 0.2221, 0.0242, 0.1548, 4, 0.0047);
  const secondRounded = getCachedRoundedBoxGeometry(THREE, 0.2228, 0.0248, 0.1549, 4, 0.0049);
  assert.equal(firstRounded, secondRounded);

  const firstExtrude = getCachedExtrudeGeometry(THREE, 'shirt:0.031:0.7:0.2:0.004', () => new THREE.Shape(), {
    depth: 0.2,
  });
  const secondExtrude = getCachedExtrudeGeometry(
    THREE,
    'shirt:0.031:0.7:0.2:0.004',
    () => {
      throw new Error('cached extrude geometry should not recreate the shape');
    },
    { depth: 0.2 }
  );
  assert.equal(firstExtrude, secondExtrude);
  assert.equal(firstBox.userData.__sharedVisualContentGeometry, true);
});

test('visuals_contents geometry cache perf stats separate cold misses from warm hits by folded usage', () => {
  const { App } = createApp();
  const THREE = App.deps.THREE;
  THREE.RoundedBoxGeometry = FakeBoxGeometry;

  resetVisualContentGeometryCachePerfStats(App);
  const cold = getCachedRoundedBoxGeometry(THREE, 0.221, 0.024, 0.154, 4, 0.005, 'folded.body');
  const coldStats = getVisualContentGeometryCachePerfStats(App);
  assert.equal(coldStats?.roundedBox.lookups, 1);
  assert.equal(coldStats?.roundedBox.hits, 0);
  assert.equal(coldStats?.roundedBox.misses, 1);
  assert.equal(coldStats?.byUsage['folded.body']?.uniqueKeys, 1);

  resetVisualContentGeometryCachePerfStats(App);
  const warm = getCachedRoundedBoxGeometry(THREE, 0.221, 0.024, 0.154, 4, 0.005, 'folded.body');
  const warmStats = getVisualContentGeometryCachePerfStats(App);
  assert.equal(warm, cold);
  assert.equal(warmStats?.roundedBox.lookups, 1);
  assert.equal(warmStats?.roundedBox.hits, 1);
  assert.equal(warmStats?.roundedBox.misses, 0);
  assert.equal(warmStats?.geometryCacheSizeAtReset, warmStats?.geometryCacheSize);
});

test('visuals_contents realistic hanger consumes the explicit showHanger flag and scales to narrow modules', () => {
  const { App, outlined } = createApp({ buildUI: { showHanger: false }, ui: { showHanger: false } });
  const parent = new FakeGroup();

  addRealisticHanger(
    App,
    0.1,
    1.0,
    -0.1,
    parent as any,
    0.18,
    hangerContentsPolicy(true, true, mesh => outlined.push(mesh))
  );

  assert.equal(parent.children.length, 1);
  const hangerGroup = parent.children[0];
  assert.equal(hangerGroup.children.length, 4);
  assert.equal(outlined.length, 1);
  assert.ok(Math.abs(hangerGroup.scale.x - 0.13 / 0.44) < 1e-9);
  assert.equal(hangerGroup.scale.x, hangerGroup.scale.y);
  assert.equal(hangerGroup.scale.y, hangerGroup.scale.z);
  assert.equal(hangerGroup.position.x, 0.1);
  assert.equal(hangerGroup.position.y, 0.945);
  assert.equal(hangerGroup.position.z, -0.1);

  const disabledParent = new FakeGroup();
  addRealisticHanger(App, 0, 1, 0, disabledParent as any, 0.18, hangerContentsPolicy(false));
  assert.equal(disabledParent.children.length, 0);
});

test('visuals_contents removes hangers whose physical bounds collide with the room-column liner cut', () => {
  const roomArchitecture = {
    backWall: { enabled: true, widthCm: 200, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    column: {
      enabled: true,
      offsetLeftCm: 42.5,
      widthCm: 3,
      depthCm: 20,
      heightCm: 200,
      bottomOffsetCm: 0,
    },
    surfacesHidden: false,
  };
  const { App } = createApp({
    config: { roomArchitecture },
    runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2, wardrobeDepthM: 0.6 },
  });

  const singleParent = new FakeGroup();
  addRealisticHanger(
    App,
    -0.06,
    1.4,
    -0.2,
    singleParent as any,
    0.8,
    hangerContentsPolicy(true, false, null, createRoomArchitecturePlanFromApp(App))
  );
  assert.equal(singleParent.children.length, 0);

  const hangingParent = new FakeGroup();
  addHangingClothes(
    App,
    0,
    1.4,
    -0.2,
    0.16,
    hangingParent as any,
    1.3,
    0.2,
    hangingContentsPolicy('profile', true, false, null, createRoomArchitecturePlanFromApp(App))
  );
  const hangers = hangingParent.children.filter(child => child.userData.__kind === 'hanging_hanger');
  const clothes = hangingParent.children.filter(child => child.userData.__kind === 'hanging_cloth');
  assert.equal(hangers.length, 3);
  assert.equal(clothes.length, 3);
  assert.ok(hangers.every(hanger => hanger.position.x > -0.045));
});
