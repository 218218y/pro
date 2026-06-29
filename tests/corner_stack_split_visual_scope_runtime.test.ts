import assert from 'node:assert/strict';
import test from 'node:test';

import { processCornerDoorVisual } from '../esm/native/builder/corner_wing_cell_doors_rendering.ts';
import { pushCornerConnectorDoorSegmentVisual } from '../esm/native/builder/corner_connector_door_emit_visuals.ts';
import { applyStackSplitLowerCornerWingIfNeeded } from '../esm/native/builder/build_stack_split_context.ts';

class FakeGroup {
  children: unknown[] = [];
  userData: Record<string, unknown> = {};
  position = { set: (_x: number, _y: number, _z: number) => undefined };
  add(child: unknown): void {
    this.children.push(child);
  }
}

class FakeMesh extends FakeGroup {
  constructor(
    public geometry?: unknown,
    public material?: unknown
  ) {
    super();
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  BoxGeometry: class {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  },
  MeshBasicMaterial: class {
    constructor(public params: Record<string, unknown>) {}
  },
  MeshStandardMaterial: class {
    constructor(public params: Record<string, unknown>) {}
  },
  DoubleSide: 'DoubleSide',
};

function scopeCornerBottomPartId(partId: unknown): string {
  const raw = String(partId || '');
  return raw.startsWith('lower_') ? raw : raw.startsWith('corner_') ? `lower_${raw}` : raw;
}

function createSharedCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    App: {},
    THREE: fakeThree,
    stackKey: 'bottom',
    stackSplitEnabled: true,
    stackScopePartKey: scopeCornerBottomPartId,
    removeDoorsEnabled: false,
    isDoorRemoved: () => false,
    MODES: { REMOVE_DOOR: 'remove_door' },
    primaryMode: 'none',
    getCornerMat: () => ({}),
    frontMat: {},
    cfg0: { isMultiColorMode: false, doorStyleMap: {} },
    getCurtain: null,
    getGroove: null,
    readScopedReader: () => null,
    resolveSpecial: () => null,
    getMirrorMat: () => ({}),
    addOutlines: () => undefined,
    doorStyle: 'flat',
    groovesEnabled: false,
    readMap: () => ({}),
    doorTrimMap: {},
    asRecord: (value: unknown) => (value && typeof value === 'object' ? value : {}),
    render: { doorsArray: [] },
    ...overrides,
  };
}

test('bottom corner-wing door visual children receive the scoped lower part id', () => {
  const capturedGroovePartIds: unknown[] = [];
  const group = new FakeGroup();
  const ctx = createSharedCtx({
    createDoorVisual: (...args: unknown[]) => {
      capturedGroovePartIds.push(args[12]);
      const visual = new FakeGroup();
      visual.userData.partId = args[12];
      return visual;
    },
  });

  const added = processCornerDoorVisual(ctx as never, 'corner_door_1_full', {
    partId: 'corner_door_1_full',
    width: 0.5,
    height: 1.2,
    group: group as never,
    meshOffset: 0,
    groovePartId: 'corner_door_1_full',
  });

  assert.equal(added, true);
  assert.deepEqual(capturedGroovePartIds, ['lower_corner_door_1_full']);
  assert.equal((group.children[0] as FakeGroup).userData.partId, 'lower_corner_door_1_full');
});

test('bottom corner-pentagon door visual children receive the scoped lower part id', () => {
  const capturedGroovePartIds: unknown[] = [];
  const mount = new FakeGroup();
  const ctx = createSharedCtx({
    mount,
    len: 1,
    doorW: 0.55,
    zOut: 0.02,
    outwardZSign: 1,
    createDoorVisual: (...args: unknown[]) => {
      capturedGroovePartIds.push(args[12]);
      const visual = new FakeGroup();
      visual.userData.partId = args[12];
      return visual;
    },
  });
  const state = {
    doorIndex: 1,
    doorBaseId: 'corner_pent_door_1',
    scopedDoorBaseId: 'lower_corner_pent_door_1',
    hingeSide: 'left',
    pivotX: 0,
    meshOffset: 0,
    topSplitEnabled: false,
    bottomSplitEnabled: false,
    shouldSplit: false,
    defaultHandleAbsY: 0.5,
  };

  pushCornerConnectorDoorSegmentVisual(
    ctx as never,
    state as never,
    'corner_pent_door_1_full',
    1.1,
    0.7,
    0.5
  );

  assert.deepEqual(capturedGroovePartIds, ['lower_corner_pent_door_1_full']);
  const hinge = mount.children[0] as FakeGroup;
  assert.equal(hinge.userData.partId, 'lower_corner_pent_door_1_full');
  assert.equal((hinge.children[0] as FakeGroup).userData.partId, 'lower_corner_pent_door_1_full');
});

test('stack-split lower corner build forwards the lower UI with the shared config/mode snapshot', () => {
  const ui = { cornerWidth: 135, cornerDepth: 55 };
  const cfg = { cornerConfiguration: { layout: 'shelves' } };
  let receivedMeta: any = null;

  applyStackSplitLowerCornerWingIfNeeded({
    buildArgs: {
      App: {},
      isCornerMode: true,
      woodThick: 0.018,
      shelfThick: 0.018,
      bodyMat: {},
      globalFrontMat: {},
      defaultShelfMat: {},
      braceShelfMat: {},
      baseTypeBottom: 'plinth',
      stackSplitUnifiedFrame: true,
      cfg,
      sketchMode: false,
      addOutlines: () => undefined,
      buildCornerWing(...args: any[]) {
        receivedMeta = args[6];
      },
    } as any,
    lowerCtx: {
      ui,
      state: { mode: { primary: 'groove' } },
      dims: { totalW: 1.4, cabinetBodyHeight: 0.9, D: 0.55, startY: 0, startZ: 0.12 },
    } as any,
  });

  assert.equal(receivedMeta.snapshot.ui, ui);
  assert.equal(receivedMeta.snapshot.cfg, cfg);
  assert.equal(receivedMeta.snapshot.primaryMode, 'groove');
  assert.equal(receivedMeta.snapshot.renderPolicy.sketchMode, false);
  assert.equal(receivedMeta.stackSplitUnifiedFrame, true);
  assert.equal(receivedMeta.stackOffsetZ, 0.12);
});

test('stack-split lower corner build rejects string-encoded build-context dimensions', () => {
  let called = false;

  assert.throws(
    () =>
      applyStackSplitLowerCornerWingIfNeeded({
        buildArgs: {
          App: {},
          isCornerMode: true,
          buildCornerWing() {
            called = true;
          },
        } as any,
        lowerCtx: {
          ui: {},
          state: { mode: { primary: 'none' } },
          dims: {
            totalW: '1.4',
            cabinetBodyHeight: 0.9,
            D: 0.55,
            startY: 0,
          },
        } as any,
      }),
    /finite numbers/
  );

  assert.equal(called, false);
});
