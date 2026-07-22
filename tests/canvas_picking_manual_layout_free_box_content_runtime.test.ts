import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveBraceShelvesFreeBoxPlan,
  resolveManualLayoutFreeBoxShelfGridPlan,
  resolvePresetLayoutFreeBoxPlan,
  tryCommitBraceShelvesFreeBoxFromHover,
  tryCommitManualLayoutFreeBoxFromHover,
  tryCommitPresetLayoutFreeBoxFromHover,
  tryHandleBraceShelvesFreeBoxHover,
  tryHandleManualLayoutFreeBoxHover,
  tryHandlePresetLayoutFreeBoxHover,
} from '../esm/native/services/canvas_picking_manual_layout_free_box_content.ts';
import {
  INTERIOR_ROD_RENDER_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import {
  __wp_readSketchHover,
  __wp_writeSketchHover,
} from '../esm/native/services/canvas_picking_local_helpers.ts';
import { resolveSketchBoxVerticalContentPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';
import {
  requireSketchStructuralCommandHover,
  withSketchStructuralCommand,
} from './_sketch_structural_command_fixture.ts';

type RecordMap = Record<string, unknown>;

function makeNoMainApp(args: {
  patchCfg: RecordMap;
  hover?: RecordMap;
  toasts?: Array<[string, string | undefined]>;
  patchCalls?: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }>;
}) {
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [],
    },
    ui: { raw: { doors: 0 } },
    mode: {},
    runtime: {},
    meta: {},
  };
  const patchCalls = args.patchCalls ?? [];
  const toasts = args.toasts ?? [];
  const App = {
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: { cache: {} },
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
    actions: {
      modules: {
        patchForStack: (
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: Record<string, unknown>
        ) => {
          patchCalls.push({ side, moduleKey, options });
          patcher(args.patchCfg);
        },
      },
    },
  };
  if (args.hover) __wp_writeSketchHover(App as never, args.hover);
  return { App: App as never, patchCalls, toasts };
}

test('manual-layout free-box shelf grid scopes five shelves to the active split cell', () => {
  const targetBox = {
    id: 'free-split',
    freePlacement: true,
    dividers: [{ id: 'v1', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5 }],
  };

  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox,
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0.25,
    pointerY: 1.25,
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  });

  assert.equal(plan.blockedReason, null);
  assert.equal(plan.shelfYs.length, 5);
  assert.equal(plan.shelfYNorms.length, 5);
  assert.ok(plan.shelfYs.every(y => y > 1 && y < 1.5));
  assert.ok(plan.shelfYNorms.every(yNorm => yNorm > 0.5 && yNorm < 1));
  assert.ok(plan.cellXNormMin >= 0.5);
  assert.equal(plan.cellXNormMax, 1);
  assert.ok(plan.contentXNorm > 0.5);
  assert.ok(plan.previewX > 0);
  assert.ok(plan.previewW <= 0.5);
});

test('manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short', () => {
  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox: { id: 'free-short', freePlacement: true },
    targetGeo: { centerX: 0, innerW: 0.8, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 0.12,
    pointerX: 0,
    pointerY: 1,
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  });

  assert.equal(plan.blockedReason, 'no-room');
  assert.equal(plan.shelfYs.length, 5);
});

test('manual-layout free-box shelf grid commit writes shelves into the no-main free box', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-split',
          freePlacement: true,
          absX: 1.2,
          absY: 1,
          widthM: 1,
          heightM: 1,
          depthM: 0.5,
          shelves: [
            { id: 'old-active', yNorm: 0.7, xNorm: 0.75, variant: 'regular' },
            { id: 'old-other-cell', yNorm: 0.25, xNorm: 0.25, variant: 'regular' },
            { id: 'old-string-cell', yNorm: 0.7, xNorm: '0.75', variant: 'regular' },
          ],
        },
      ],
    },
  };
  const { App, patchCalls } = makeNoMainApp({
    patchCfg: cfg,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      op: 'add',
      freePlacement: true,
      boxId: 'free-split',
      shelfYNorms: [0.58, 0.66, 0.74, 0.82, 0.9],
      cellXNormMin: 0.5,
      cellXNormMax: 1,
      cellYNormMin: 0.5,
      cellYNormMax: 1,
      contentXNorm: 0.75,
      variant: 'regular',
      depthM: 0.37,
      freeBoxCommand: {
        version: 1,
        command: {
          kind: 'shelf-grid',
          boxId: 'free-split',
          shelfYNorms: [0.58, 0.66, 0.74, 0.82, 0.9],
          cellXNormMin: 0.5,
          cellXNormMax: 1,
          cellYNormMin: 0.5,
          cellYNormMax: 1,
          contentXNorm: 0.75,
          variant: 'regular',
          depthM: 0.37,
          blockedReason: null,
        },
      },
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'manualLayout.freeBoxShelfGrid', immediate: true },
  });

  const box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  const shelves = box.shelves as RecordMap[];
  assert.equal(shelves.length, 7);
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-active'),
    false
  );
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-other-cell'),
    true
  );
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-string-cell'),
    true
  );
  assert.equal(shelves.filter(shelf => String(shelf.id || '').startsWith('sbc_')).length, 5);
  assert.ok(
    shelves
      .filter(shelf => String(shelf.id || '').startsWith('sbc_'))
      .every(shelf => shelf.xNorm === 0.75 && shelf.variant === 'regular' && shelf.depthM === 0.37)
  );
  assert.equal(__wp_readSketchHover(App), null);
});

test('manual-layout free-box shelf grid blocked commit consumes click without mutating', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [{ id: 'free-short', freePlacement: true, shelves: [] }],
    },
  };
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];
  const toasts: Array<[string, string | undefined]> = [];
  const { App } = makeNoMainApp({
    patchCfg: cfg,
    patchCalls,
    toasts,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      op: 'add',
      freePlacement: true,
      boxId: 'free-short',
      shelfYNorms: [0.2, 0.4, 0.6, 0.8, 0.9],
      __wpBlockedReason: 'no-room',
      freeBoxCommand: {
        version: 1,
        command: {
          kind: 'shelf-grid',
          boxId: 'free-short',
          shelfYNorms: [0.2, 0.4, 0.6, 0.8, 0.9],
          cellXNormMin: 0,
          cellXNormMax: 1,
          cellYNormMin: 0,
          cellYNormMax: 1,
          contentXNorm: 0.5,
          variant: 'regular',
          depthM: null,
          blockedReason: 'no-room',
        },
      },
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  assert.equal(patchCalls.length, 0);
  assert.equal(((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0]?.shelves?.length, 0);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.[1], 'error');
  assert.equal(__wp_readSketchHover(App), null);
});

test('manual-layout free-box shelf grid rejects partial hover records without mutating content', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-partial',
          freePlacement: true,
          shelves: [{ id: 'keep-me', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }],
        },
      ],
    },
  };
  const { App, patchCalls } = makeNoMainApp({
    patchCfg: cfg,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      op: 'add',
      freePlacement: true,
      boxId: 'free-partial',
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  assert.equal(patchCalls.length, 0);
  const box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.deepEqual(box.shelves, [{ id: 'keep-me', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }]);
  assert.equal(__wp_readSketchHover(App), null);
});

test('manual-layout free-box shelf grid blocks shelves that would collide with an existing rod', () => {
  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox: { id: 'free-cross', freePlacement: true, rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }] },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    currentGridDivisions: 4,
    shelfVariant: 'regular',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, 'collision');
  assert.equal(plan.shelfYNorms.includes(0.5), true);
});

test('manual-layout free-box rod hover can target an existing shelf for removal', () => {
  const preview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'rod', moduleKey: 0, isBottom: false },
    contentKind: 'rod',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: {
      id: 'free-cross',
      freePlacement: true,
      shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(preview);
  const command = requireSketchStructuralCommandHover(preview.hoverRecord);
  assert.equal(command.contentKind, 'shelf');
  assert.equal(command.command.op, 'remove');
  assert.equal(command.command.kind, 'remove-shelf');
  if (command.command.kind !== 'remove-shelf') throw new Error('expected shelf removal');
  assert.equal(command.command.removeId, 'shelf-1');
  assert.equal(preview.preview.kind, 'shelf');
  assert.equal(preview.preview.op, 'remove');
});

test('manual-layout free-box shelf edit can target an existing rod or storage barrier for removal', () => {
  const rodPreview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'shelf', moduleKey: 0, isBottom: false },
    contentKind: 'shelf',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: { id: 'free-cross', freePlacement: true, rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }] },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    shelfVariant: 'regular',
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
  const storagePreview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'shelf', moduleKey: 0, isBottom: false },
    contentKind: 'shelf',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: {
      id: 'free-cross',
      freePlacement: true,
      storageBarriers: [{ id: 'storage-1', yNorm: 0.5, xNorm: 0.5, heightM: 0.12 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    shelfVariant: 'regular',
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(rodPreview);
  assert.ok(storagePreview);
  const rodCommand = requireSketchStructuralCommandHover(rodPreview.hoverRecord);
  const storageCommand = requireSketchStructuralCommandHover(storagePreview.hoverRecord);
  assert.equal(rodCommand.contentKind, 'rod');
  assert.equal(rodCommand.command.kind, 'remove-rod');
  if (rodCommand.command.kind !== 'remove-rod') throw new Error('expected rod removal');
  assert.equal(rodCommand.command.removeId, 'rod-1');
  assert.equal(storageCommand.contentKind, 'storage');
  assert.equal(storageCommand.command.kind, 'remove-storage');
  if (storageCommand.command.kind !== 'remove-storage') throw new Error('expected storage removal');
  assert.equal(storageCommand.command.removeId, 'storage-1');
});

test('manual-layout free-box commits cross-kind removal hovers from shelf and rod tools', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-cross',
          freePlacement: true,
          shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }],
          rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }],
          storageBarriers: [{ id: 'storage-1', yNorm: 0.5, xNorm: 0.5, heightM: 0.12 }],
        },
      ],
    },
  };

  const { App } = makeNoMainApp({
    patchCfg: cfg,
    hover: withSketchStructuralCommand(
      {
        kind: 'remove-rod',
        op: 'remove',
        boxId: 'free-cross',
        freePlacement: true,
        blockedReason: null,
        removeId: 'rod-1',
        removeIdx: null,
      },
      { tool: 'shelf', moduleKey: 0 }
    ),
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  let box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.rods as RecordMap[]) ?? []).length, 0);

  __wp_writeSketchHover(
    App,
    withSketchStructuralCommand(
      {
        kind: 'remove-shelf',
        op: 'remove',
        boxId: 'free-cross',
        freePlacement: true,
        blockedReason: null,
        removeId: 'shelf-1',
        removeIdx: null,
      },
      { tool: 'rod', moduleKey: 0 }
    )
  );
  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'rod', 0), true);
  box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.shelves as RecordMap[]) ?? []).length, 0);

  __wp_writeSketchHover(
    App,
    withSketchStructuralCommand(
      {
        kind: 'remove-storage',
        op: 'remove',
        boxId: 'free-cross',
        freePlacement: true,
        blockedReason: null,
        removeId: 'storage-1',
        removeIdx: null,
      },
      { tool: 'rod', moduleKey: 0 }
    )
  );
  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'rod', 0), true);
  box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.storageBarriers as RecordMap[]) ?? []).length, 0);
});

test('manual-layout free-box storage removal hover covers the whole existing barrier height', () => {
  const preview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_storage:12', moduleKey: 0, isBottom: false },
    contentKind: 'storage',
    boxId: 'free-storage-wide',
    freePlacement: true,
    targetBox: {
      id: 'free-storage-wide',
      freePlacement: true,
      storageBarriers: [{ id: 'storage-wide', yNorm: 0.5, xNorm: 0.5, heightM: 0.2 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1.08,
    woodThick: 0.02,
    storageHeight: 0.12,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(preview);
  const command = requireSketchStructuralCommandHover(preview.hoverRecord);
  assert.equal(command.contentKind, 'storage');
  assert.equal(command.command.kind, 'remove-storage');
  if (command.command.kind !== 'remove-storage') throw new Error('expected storage removal');
  assert.equal(command.command.removeId, 'storage-wide');
  assert.equal(preview.preview.kind, 'storage');
  assert.equal(preview.preview.op, 'remove');
});

class LocalVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone(): LocalVector3 {
    return new LocalVector3(this.x, this.y, this.z);
  }

  add(other: { x: number; y: number; z: number }): LocalVector3 {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  sub(other: { x: number; y: number; z: number }): LocalVector3 {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  multiplyScalar(value: number): LocalVector3 {
    this.x *= value;
    this.y *= value;
    this.z *= value;
    return this;
  }
}

class LocalBox3 {}

function makeFreeBoxHoverHarness(args: { box: RecordMap; pointerX?: number; pointerY?: number }) {
  const boxId = String(args.box.id);
  const pointerX = args.pointerX ?? Number(args.box.absX ?? 0);
  const pointerY = args.pointerY ?? Number(args.box.absY ?? 1);
  const modCfg: RecordMap = { sketchExtras: { boxes: [args.box] } };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'manual_layout', opts: {} },
    runtime: {},
    meta: {},
  };
  const events: string[] = [];
  const layoutPreviews: RecordMap[] = [];
  const sketchPreviews: RecordMap[] = [];
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: pointerX, y: pointerY, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: `sketch_box_free_0_${boxId}_back` } },
        point: { x: pointerX, y: pointerY, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: { modules: { patchForStack() {} } },
  };

  return {
    App: App as never,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    events,
    layoutPreviews,
    sketchPreviews,
    setLayoutPreview: (preview: RecordMap) => {
      events.push('set-layout');
      layoutPreviews.push(preview);
    },
    setSketchPreview: (preview: RecordMap) => {
      events.push('set-sketch');
      sketchPreviews.push(preview);
    },
    hideLayoutPreview: () => {
      events.push('hide-layout');
    },
    hideSketchPreview: () => {
      events.push('hide-sketch');
    },
  };
}

test('manual-layout shelf-grid defaults and span boundary come from focused owners', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const spanMin = INTERIOR_SHELF_GEOMETRY_POLICY.spanMinHeightM;
  const base = {
    targetBox: { id: 'free-owner-boundary', freePlacement: true },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    pointerX: 0,
    pointerY: 1,
    currentGridDivisions: 2,
    shelfVariant: 'regular',
  };
  const atBoundary = resolveManualLayoutFreeBoxShelfGridPlan({
    ...base,
    targetHeight: spanMin * 2 + woodThick * 2,
  });
  const belowBoundary = resolveManualLayoutFreeBoxShelfGridPlan({
    ...base,
    targetHeight: spanMin * 2 + woodThick * 2 - 1e-6,
  });
  const normalizedGrid = resolveManualLayoutFreeBoxShelfGridPlan({
    ...base,
    targetHeight: 1,
    currentGridDivisions: Number.NaN,
  });

  assert.equal(atBoundary.previewWoodThick, woodThick);
  assert.equal(atBoundary.blockedReason, null);
  assert.equal(atBoundary.shelfYs.length, 1);
  assert.equal(belowBoundary.blockedReason, 'no-room');
  assert.equal(normalizedGrid.shelfYs.length, INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault - 1);
  assert.equal(normalizedGrid.cellXNormMin, 0);
  assert.equal(normalizedGrid.cellXNormMax, 1);
  assert.ok(normalizedGrid.cellYNormMin >= 0 && normalizedGrid.cellYNormMax <= 1);
});

test('manual-layout preset defaults preserve focused grid, rod, storage and material geometry', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const targetHeight = 1.6;
  const targetCenterY = 1;
  const targetGeo = { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 };
  const plan = resolvePresetLayoutFreeBoxPlan({
    targetBox: { id: 'free-owner-preset', freePlacement: true },
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX: 0,
    pointerY: 1,
    layoutType: 'storage',
  });
  const cellBottomY = targetCenterY - targetHeight / 2 + woodThick;
  const step = (targetHeight - woodThick * 2) / INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;

  assert.equal(plan.previewWoodThick, woodThick);
  assert.deepEqual(plan.shelfYs, [cellBottomY + 5 * step, cellBottomY + 4 * step]);
  assert.deepEqual(plan.rodYs, [cellBottomY + 3.8 * step]);
  assert.deepEqual(plan.storageBarrier, {
    y: cellBottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM / 2,
    h: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
    z: targetGeo.innerBackZ + targetGeo.innerD + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
  });
  assert.equal(INTERIOR_ROD_RENDER_POLICY.radiusM * 2, 0.03);
  assert.equal(plan.blockedReason, null);

  const shortHeight = INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM / 2;
  const tooShort = resolvePresetLayoutFreeBoxPlan({
    targetBox: { id: 'free-owner-preset-short', freePlacement: true },
    targetGeo,
    targetCenterY,
    targetHeight: shortHeight,
    pointerX: 0,
    pointerY: 1,
    layoutType: 'storage',
  });
  assert.equal(tooShort.blockedReason, 'no-room');
  assert.ok(tooShort.storageBarrier!.y > targetCenterY + shortHeight / 2);
});

test('manual-layout brace plan keeps exact tolerance, nearest identity, cell filter and variant depth', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const tolerance = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM;
  const base = {
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 0,
    targetHeight: 1,
    pointerX: 0,
    woodThick,
  };
  const boundary = resolveBraceShelvesFreeBoxPlan({
    ...base,
    targetBox: {
      id: 'brace-boundary',
      shelves: [{ id: 42, yNorm: 0.5, xNorm: 0.5, variant: 'regular' }],
    },
    pointerY: tolerance,
  });
  const aboveBoundary = resolveBraceShelvesFreeBoxPlan({
    ...base,
    targetBox: {
      id: 'brace-above',
      shelves: [{ id: 'too-far', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }],
    },
    pointerY: tolerance + 1e-6,
  });

  assert.ok(boundary);
  assert.equal(boundary.shelfId, '42');
  assert.equal(boundary.shelfIdx, 0);
  assert.equal(boundary.nextVariant, 'brace');
  assert.equal(boundary.nextDepthM, base.targetGeo.innerD);
  assert.equal(aboveBoundary, null);

  const activeCell = resolveBraceShelvesFreeBoxPlan({
    ...base,
    pointerX: 0.25,
    pointerY: 0,
    targetBox: {
      id: 'brace-cell',
      dividers: [{ id: 'v1', xNorm: 0.5 }],
      shelves: [
        { id: 'other-cell', yNorm: 0.5, xNorm: 0.25, variant: 'regular' },
        { id: 'first-tie', yNorm: 0.5, xNorm: 0.75, variant: 'brace' },
        { id: 'second-tie', yNorm: 0.5, xNorm: 0.75, variant: 'brace' },
      ],
    },
  });
  assert.ok(activeCell);
  assert.equal(activeCell.shelfId, 'first-tie');
  assert.equal(activeCell.shelfIdx, 1);
  assert.equal(activeCell.nextVariant, 'regular');
  assert.equal(activeCell.nextDepthM, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);

  for (const [yNorm, expectedY] of [
    [woodThick, -0.5 + woodThick * 1.5],
    [1 - woodThick, 0.5 - woodThick * 1.5],
  ] as const) {
    const clamped = resolveBraceShelvesFreeBoxPlan({
      ...base,
      targetBox: { shelves: [{ id: `clamp-${yNorm}`, yNorm, xNorm: 0.5, variant: 'regular' }] },
      pointerY: expectedY,
    });
    assert.ok(clamped);
    assert.equal(clamped.shelfY, expectedY);
  }
});

test('manual-layout content hover preserves default thickness, storage height and preview order', () => {
  for (const contentKind of ['rod', 'storage'] as const) {
    const harness = makeFreeBoxHoverHarness({
      box: {
        id: `free-${contentKind}-owner`,
        freePlacement: true,
        absX: 0.2,
        absY: 1.1,
        widthM: 0.8,
        heightM: 1,
        depthM: 0.4,
      },
      pointerX: 0.2,
      pointerY: 1.1,
    });
    const handled = tryHandleManualLayoutFreeBoxHover({
      App: harness.App,
      tool: contentKind,
      ndcX: 0,
      ndcY: 0,
      raycaster: harness.raycaster,
      mouse: harness.mouse,
      currentGridDivisions: 6,
      shelfVariant: 'regular',
      setLayoutPreview: harness.setLayoutPreview,
      setSketchPreview: harness.setSketchPreview,
      hideLayoutPreview: harness.hideLayoutPreview,
      hideSketchPreview: harness.hideSketchPreview,
    });

    assert.equal(handled, true);
    assert.deepEqual(harness.events, ['hide-layout', 'set-sketch']);
    assert.equal(harness.layoutPreviews.length, 0);
    assert.equal(harness.sketchPreviews[0]?.kind, contentKind);
    assert.equal(harness.sketchPreviews[0]?.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
    if (contentKind === 'storage') {
      assert.equal(harness.sketchPreviews[0]?.h, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
    }
  }
});

test('manual-layout shelf-grid add remains a layout preview with canonical hide/set order', () => {
  const harness = makeFreeBoxHoverHarness({
    box: {
      id: 'free-layout-preview-owner',
      freePlacement: true,
      absX: 0.2,
      absY: 1.1,
      widthM: 0.8,
      heightM: 1,
      depthM: 0.4,
      shelves: [],
    },
    pointerX: 0.2,
    pointerY: 1.1,
  });
  const handled = tryHandleManualLayoutFreeBoxHover({
    App: harness.App,
    tool: 'shelf',
    ndcX: 0,
    ndcY: 0,
    raycaster: harness.raycaster,
    mouse: harness.mouse,
    currentGridDivisions: INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault,
    shelfVariant: 'regular',
    setLayoutPreview: harness.setLayoutPreview,
    setSketchPreview: harness.setSketchPreview,
    hideLayoutPreview: harness.hideLayoutPreview,
    hideSketchPreview: harness.hideSketchPreview,
  });

  assert.equal(handled, true);
  assert.deepEqual(harness.events, ['hide-layout', 'hide-sketch', 'set-layout']);
  assert.equal(harness.sketchPreviews.length, 0);
  assert.equal(harness.layoutPreviews.length, 1);
  assert.equal(harness.layoutPreviews[0]?.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
});

test('brace hover preserves brace clearance and regular minimum-width branches', () => {
  const cases = [
    {
      id: 'brace-clearance-owner',
      widthM: 0.8,
      currentVariant: 'regular',
      nextVariant: 'brace',
      expectedWidth:
        0.8 -
        MATERIAL_THICKNESS_POLICY.wood.thicknessM * 2 -
        SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM,
    },
    {
      id: 'regular-min-width-owner',
      widthM: 0.05,
      currentVariant: 'brace',
      nextVariant: 'regular',
      expectedWidth: SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
    },
  ] as const;

  for (const entry of cases) {
    const harness = makeFreeBoxHoverHarness({
      box: {
        id: entry.id,
        freePlacement: true,
        absX: 0.2,
        absY: 1.1,
        widthM: entry.widthM,
        heightM: 1,
        depthM: 0.4,
        shelves: [{ id: 'shelf-owner', yNorm: 0.5, xNorm: 0.5, variant: entry.currentVariant }],
      },
      pointerX: 0.2,
      pointerY: 1.1,
    });
    const handled = tryHandleBraceShelvesFreeBoxHover({
      App: harness.App,
      ndcX: 0,
      ndcY: 0,
      raycaster: harness.raycaster,
      mouse: harness.mouse,
      setSketchPreview: harness.setSketchPreview,
      hideLayoutPreview: harness.hideLayoutPreview,
      hideSketchPreview: harness.hideSketchPreview,
    });

    assert.equal(handled, true);
    assert.deepEqual(harness.events, ['hide-layout', 'set-sketch']);
    assert.equal(harness.sketchPreviews[0]?.variant, entry.nextVariant);
    assert.equal(harness.sketchPreviews[0]?.w, entry.expectedWidth);
  }
});

test('manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1,
          depthM: 0.4,
          shelves: [],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'manual_layout', opts: { manualTool: 'shelf' } },
    runtime: {},
    meta: {},
  };
  const layoutPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const hideCalls = { layout: 0, sketch: 0 };
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.1, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-1_back' } },
        point: { x: 0.2, y: 1.1, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandleManualLayoutFreeBoxHover({
    App: App as never,
    tool: 'shelf',
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    setLayoutPreview: (preview: RecordMap) => {
      layoutPreviews.push(preview);
    },
    setSketchPreview: null,
    hideLayoutPreview: () => {
      hideCalls.layout += 1;
    },
    hideSketchPreview: () => {
      hideCalls.sketch += 1;
    },
  });

  assert.equal(handled, true);
  assert.equal(hideCalls.sketch, 1);
  assert.equal(layoutPreviews.length, 1);
  assert.equal(Array.isArray(layoutPreviews[0]?.shelfYs), true);
  assert.equal((layoutPreviews[0]?.shelfYs as unknown[]).length, 5);

  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_grid');
  assert.equal(hover.contentKind, 'shelf_grid');
  assert.equal(hover.freePlacement, true);
  assert.equal(hover.boxId, 'free-1');
  assert.equal(hover.hostModuleKey, 0);

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App as never, 'shelf', 0), true);
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'top');
  assert.equal(patchCalls[0]?.moduleKey, 0);
  const shelves = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0]?.shelves ??
    []) as RecordMap[];
  assert.equal(shelves.length, 5);
  assert.equal(__wp_readSketchHover(App as never), null);
});

test('preset layout free-box plan maps storage shortcut into active split cell contents', () => {
  const targetBox = {
    id: 'free-storage-split',
    freePlacement: true,
    dividers: [{ id: 'v1', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5 }],
  };

  const plan = resolvePresetLayoutFreeBoxPlan({
    targetBox,
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1.6,
    pointerX: 0.25,
    pointerY: 1.25,
    layoutType: 'storage',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, null);
  assert.equal(plan.shelfYNorms.length, 2);
  assert.equal(plan.rodYNorms.length, 1);
  assert.ok(plan.storageYNorm != null);
  assert.ok(plan.cellXNormMin >= 0.5);
  assert.equal(plan.cellXNormMax, 1);
  assert.ok(plan.shelfYNorms.every(yNorm => yNorm > 0.5 && yNorm < 1));
});

test('preset layout shortcut hover and click target the free box instead of the wardrobe behind it', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-layout',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1.6,
          depthM: 0.4,
          dividers: [{ id: 'v1', xNorm: 0.5 }],
          shelves: [{ id: 'old-other-cell', yNorm: 0.25, xNorm: 0.25, variant: 'regular' }],
          rods: [],
          storageBarriers: [],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'layout', opts: { layoutType: 'storage' } },
    runtime: {},
    meta: {},
  };
  const layoutPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.25, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-layout_back' } },
        point: { x: 0.2, y: 1.25, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandlePresetLayoutFreeBoxHover({
    App: App as never,
    layoutType: 'storage',
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    setLayoutPreview: (preview: RecordMap) => {
      layoutPreviews.push(preview);
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  });

  assert.equal(handled, true);
  assert.equal(layoutPreviews.length, 1);
  assert.equal((layoutPreviews[0]?.shelfYs as unknown[]).length, 2);
  assert.equal((layoutPreviews[0]?.rodYs as unknown[]).length, 1);
  assert.ok(layoutPreviews[0]?.storageBarrier);

  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_preset');
  assert.equal(hover.contentKind, 'layout_preset');
  assert.equal(hover.freePlacement, true);
  assert.equal(hover.boxId, 'free-layout');

  assert.equal(tryCommitPresetLayoutFreeBoxFromHover(App as never), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'layoutPreset.freeBox', immediate: true },
  });
  const box = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.shelves as RecordMap[]) ?? []).length, 2);
  assert.equal(((box.rods as RecordMap[]) ?? []).length, 1);
  assert.equal(((box.storageBarriers as RecordMap[]) ?? []).length, 1);
  assert.equal(__wp_readSketchHover(App as never), null);
});

test('brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-brace',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1,
          depthM: 0.4,
          shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5, variant: 'regular', depthM: 0.37 }],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'brace_shelves', opts: {} },
    runtime: {},
    meta: {},
  };
  const sketchPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.1, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-brace_back' } },
        point: { x: 0.2, y: 1.1, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandleBraceShelvesFreeBoxHover({
    App: App as never,
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    setSketchPreview: (preview: RecordMap) => {
      sketchPreviews.push(preview);
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  });

  assert.equal(handled, true);
  assert.equal(sketchPreviews.length, 1);
  assert.equal(sketchPreviews[0]?.variant, 'brace');
  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_brace_shelf');
  assert.equal(hover.boxId, 'free-brace');
  assert.equal(hover.shelfId, 'shelf-1');

  assert.equal(tryCommitBraceShelvesFreeBoxFromHover(App as never), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'braceShelves.freeBoxToggle', immediate: true },
  });
  const box = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  const shelf = ((box.shelves as RecordMap[]) ?? [])[0] as RecordMap;
  assert.equal(shelf.variant, 'brace');
  assert.equal(shelf.depthM, 0.382);
  assert.equal(__wp_readSketchHover(App as never), null);
});
