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
} from '../esm/native/builder/visuals_contents_shared.ts';
import { CONTENT_VISUAL_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

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

test('visuals_contents hanging clothes honor showContents, style depth, and outline only cloth meshes', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true, doorStyle: 'profile' } });
  const parent = new FakeGroup();

  addHangingClothes(App, 0, 1.4, 0, 0.16, parent as any, 1.3, 0.2);

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

test('visuals_contents folded clothes clamp depth inside shelf bounds and outline only in sketch mode', () => {
  const { App, outlined } = createApp({ buildUI: { showContents: true }, runtime: { sketchMode: true } });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.6, parent as any, 0.25, 0.2);

  assert.ok(parent.children.length > 0);
  assert.equal(outlined.length, parent.children.length);

  const minShelfZ = -0.1 + 0.015;
  const maxShelfZ = 0.1 - 0.015;
  assert.ok(
    parent.children.every(child => child.position.z - child.geometry.args[2] / 2 >= minShelfZ - 1e-9)
  );
  assert.ok(
    parent.children.every(child => child.position.z + child.geometry.args[2] / 2 <= maxShelfZ + 1e-9)
  );
  assert.ok(parent.children.every(child => child.userData.__kind === 'folded_cloth_item'));
  assert.ok(
    parent.children.some(child =>
      child.children.some((detail: any) => String(detail.userData.__kind || '').startsWith('folded_cloth_'))
    )
  );
});

test('visuals_contents folded shelf renders books instead of clothes in library mode', () => {
  const { App, outlined } = createApp({
    buildUI: { showContents: true },
    config: { isLibraryMode: true },
    runtime: { sketchMode: true },
  });
  const parent = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.6, parent as any, 0.25, 0.2);

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

  addFoldedClothes(App, 0, 0.2, 0, 1.2, parent as any, 0.34, 0.24);

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

  addFoldedClothes(App, 0, 0.2, shelfZ, 1.1, parent as any, 0.42, maxDepth);

  const dims = CONTENT_VISUAL_DIMENSIONS.books;
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

  addFoldedClothes(App, 0, 0.2, 0, 1.1, parent as any, 0.42, 0.55);

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

  addFoldedClothes(App, 0, shelfY, 0, 0.6, parent as any, maxHeight, 0.2);

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
  addFoldedClothes(App, 0, shelfY, 0, 0.6, tinyParent as any, 0.075, 0.2);
  assert.equal(tinyParent.children.length, 0);
});

test('visuals_contents reuse content geometries and materials across deterministic rebuilds', () => {
  const { App } = createApp({
    buildUI: { showContents: true, doorStyle: 'profile' },
    config: { isLibraryMode: true },
  });
  const firstShelf = new FakeGroup();
  const secondShelf = new FakeGroup();

  addFoldedClothes(App, 0, 0.2, 0, 0.8, firstShelf as any, 0.28, 0.22);
  addFoldedClothes(App, 0, 0.2, 0, 0.8, secondShelf as any, 0.28, 0.22);

  assert.ok(firstShelf.children.length > 0);
  assert.equal(firstShelf.children.length, secondShelf.children.length);
  assert.equal(firstShelf.children[0].geometry, secondShelf.children[0].geometry);
  assert.equal(firstShelf.children[0].material, secondShelf.children[0].material);
  assert.equal(firstShelf.children[0].geometry.userData.__sharedVisualContentGeometry, true);
  assert.equal(firstShelf.children[0].material.userData.__sharedVisualContentMaterial, true);

  const firstRod = new FakeGroup();
  const secondRod = new FakeGroup();
  addHangingClothes(App, 0, 1.4, 0, 0.16, firstRod as any, 1.3, 0.2);
  addHangingClothes(App, 0, 1.4, 0, 0.16, secondRod as any, 1.3, 0.2);
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

test('visuals_contents realistic hanger respects showHanger override and scales to narrow modules', () => {
  const { App, outlined } = createApp({ buildUI: { showHanger: false }, ui: { showHanger: true } });
  const parent = new FakeGroup();

  addRealisticHanger(App, 0.1, 1.0, -0.1, parent as any, 0.18);

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
});
